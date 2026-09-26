package expo.modules.parktracker

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

/**
 * 位置取得 → (サーバー用にだけ1km丸め) → セルが変わったら API → ジオメトリ保存
 * → 生の位置で内外判定 → 通知 → 公園内は10秒間隔で記録（動かなければ徐々に60秒へ）
 * をすべてネイティブ側で完結させるフォアグラウンドサービス。
 * JS が止まっていても（アプリをタスクから消しても）動き続ける。
 *
 * スレッド: 位置のコールバック、API 通信、DB 書き込み、位置リクエストの変更は、
 * すべて専用の worker スレッドで順番に処理する。そのため下の「状態」フィールドはロック不要。
 */
class ParkTrackerService : Service() {

    companion object {
        private const val TAG = "ParkTracker"

        const val EXTRA_CONFIG = "config"

        // ---- 取得間隔 ----
        const val SLOW_INTERVAL_MS = 60_000L        // 公園の外
        const val FAST_INTERVAL_MS = 10_000L        // 公園の中（動いているとき）
        private const val BACKOFF_FACTOR = 1.5      // 公園の中で止まっているとき、1回ごとに間隔をこの倍率で延ばす（上限は SLOW）
        private const val STILL_FIXES_BEFORE_BACKOFF = 3 // 何回続けて「動いていない」なら延ばし始めるか
        private const val MOVE_THRESHOLD_M = 30f    // 基準点からこれ以上離れたら「動いた」とみなして10秒に戻す

        // ---- 判定 ----
        private const val MAX_ACCURACY_M = 50f      // 入園の判定と位置の記録は、精度がこれ以内の位置だけで行う
        private const val MAX_ACCURACY_FOR_CELL_M = 500f // セルの切り替え（サーバー問い合わせ）に使う位置の精度の上限
        private const val MAX_LOCATION_AGE_MS = 120_000L // これより古い位置は使わない
        private const val EXIT_BUFFER_M = 30.0      // 退園判定はジオメトリをこれだけ外側に広げて行う（さらに位置の誤差分も広げる）
        private const val EXIT_CONFIRM_COUNT = 2    // 広げた範囲の外に連続何回出たら退園とみなすか

        // ---- サーバー ----
        private const val CACHE_TTL_MS = 24L * 60 * 60 * 1000 // 同じセルのジオメトリを再取得するまでの時間
        private const val FETCH_RETRY_MS = 60_000L  // API 失敗時の最初の再試行間隔（失敗が続くと倍々に延ばす）
        private const val FETCH_RETRY_MAX_MS = 30L * 60 * 1000 // 再試行間隔の上限

        private const val FG_NOTIFICATION_ID = 1001
        private const val CH_TRACKING = "park_tracking"
        private const val CH_ENTER = "park_enter"
        private const val ENTER_NOTIFICATION_TAG = "park_enter"

        @Volatile var isRunning = false
            private set

        /** ParkTrackerModule（Expo モジュール）がセットする。JS が動いていればイベントを流す（動いていなければ null）。 */
        @Volatile var eventSink: ((name: String, body: Map<String, Any?>) -> Unit)? = null
    }

    private lateinit var client: FusedLocationProviderClient
    private lateinit var store: Store
    private lateinit var worker: HandlerThread
    private lateinit var handler: Handler
    @Volatile private var config: Config? = null
    /** このインスタンスが動作中か（停止→すぐ開始で新旧のインスタンスが重なっても、古い方は何もしない） */
    @Volatile private var alive = false

    // ---- 状態（worker スレッドからしか触らない） ----
    private var cellKey: String? = null
    private var parks: List<Park> = emptyList()
    private var needsRefetch = false
    private var lastFetchFailAt = 0L
    private var fetchFailures = 0

    /** いま中にいる公園（退園判定のためにジオメトリごと持つ。セルが変わって parks から消えても判定できる） */
    private val inside = LinkedHashMap<String, Park>()
    private val outsideCounts = HashMap<String, Int>()

    private var anchor: Location? = null           // 静止判定の基準点
    private var stillCount = 0
    private var inParkIntervalMs = FAST_INTERVAL_MS
    private var currentIntervalMs = 0L
    private var lastFixElapsedNs = 0L

    private val callback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            for (loc in result.locations) {
                try {
                    onLocation(loc)
                } catch (e: Exception) {
                    Log.e(TAG, "onLocation failed", e)
                    emit("ParkTrackerError", mapOf("message" to (e.message ?: e.toString())))
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        client = LocationServices.getFusedLocationProviderClient(this)
        store = Store.get(this)
        worker = HandlerThread("park-tracker").also { it.start() }
        handler = Handler(worker.looper)
        createChannels()
        handler.post {
            try { store.prune(System.currentTimeMillis()) } catch (e: Exception) { Log.w(TAG, "prune failed", e) }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // OS による再起動（START_STICKY。Intent が null）はバックグラウンドからの開始になる。
        // 位置の「常に許可」がないと位置が届かないまま常駐だけ続くので、その場合は再開しない。
        if (intent == null && !canRunInBackground()) {
            Log.w(TAG, "restart skipped: background location permission is missing")
            stopSelf()
            return START_NOT_STICKY
        }

        // startForegroundService で起動されたら、何よりも先に startForeground を呼ぶ（呼ばないとアプリが落ちる）
        try {
            val notification = buildTrackingNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(FG_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            } else {
                startForeground(FG_NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            // 位置の権限がない／バックグラウンドからの起動が許されない（Android 12+）など
            Log.e(TAG, "startForeground failed", e)
            stopSelf()
            return START_NOT_STICKY
        }

        // JS から start された → Intent に設定が入っている
        // OS に再起動された（START_STICKY）→ Intent は null なので保存済みの設定を使う
        val fromIntent = intent?.getStringExtra(EXTRA_CONFIG)?.let { Config.fromJson(it) }
        if (fromIntent != null) Config.save(this, fromIntent)
        val cfg = fromIntent ?: Config.load(this)
        if (cfg == null) {
            stopSelf()
            return START_NOT_STICKY
        }
        config = cfg

        alive = true
        isRunning = true
        // 2回目以降の start（すでに動いている）なら今の間隔を維持する
        handler.post { if (currentIntervalMs == 0L) setInterval(SLOW_INTERVAL_MS) }
        return START_STICKY
    }

    override fun onDestroy() {
        alive = false
        isRunning = false
        // 位置リクエストの変更は worker で行っているので、解除も worker の列の最後に積む（途中の再登録と競合させない）
        handler.post { client.removeLocationUpdates(callback) }
        client.removeLocationUpdates(callback)
        worker.quitSafely()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun granted(permission: String): Boolean =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    private fun canRunInBackground(): Boolean =
        granted(Manifest.permission.ACCESS_FINE_LOCATION) &&
            (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION))

    // ------------------------------------------------------------------
    // 位置の取得間隔（worker スレッド）
    // ------------------------------------------------------------------

    @SuppressLint("MissingPermission")
    private fun setInterval(ms: Long) {
        if (!alive || ms == currentIntervalMs) return
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, ms)
            .setMinUpdateIntervalMillis(ms) // 他アプリの要求に引きずられて頻繁に呼ばれないようにする
            .build()
        try {
            // 同じ callback で呼ぶと既存のリクエストが置き換わる（サービスは止めない）
            client.requestLocationUpdates(req, callback, worker.looper)
                .addOnFailureListener { e ->
                    // 権限の取り消しなど。位置が届かないまま常駐し続けないよう止める
                    Log.e(TAG, "requestLocationUpdates failed", e)
                    emit("ParkTrackerError", mapOf("message" to "location request failed: ${e.message}"))
                    stopSelf()
                }
            currentIntervalMs = ms
            Log.d(TAG, "interval = ${ms / 1000.0}s")
        } catch (e: SecurityException) {
            Log.e(TAG, "location permission missing", e)
            stopSelf()
        }
    }

    // ------------------------------------------------------------------
    // メインの処理（worker スレッド）
    // ------------------------------------------------------------------

    private fun onLocation(loc: Location) {
        if (!alive) return // onDestroy 後に列に残っていた位置は無視
        val cfg = config ?: return

        // 古い位置・同じ位置の重複（リクエスト変更直後に前回の位置が再送されることがある）は捨てる
        val nowNs = SystemClock.elapsedRealtimeNanos()
        if (nowNs - loc.elapsedRealtimeNanos > MAX_LOCATION_AGE_MS * 1_000_000) return
        if (loc.elapsedRealtimeNanos <= lastFixElapsedNs) return
        lastFixElapsedNs = loc.elapsedRealtimeNanos

        val now = System.currentTimeMillis()

        // 精度が不明な位置は何にも使わない（Fused Location では通常ありえない）
        if (!loc.hasAccuracy()) return
        val accurate = loc.accuracy <= MAX_ACCURACY_M

        // 1. サーバーに送る位置だけ1kmで丸める。セルが変わった（か再試行の時刻になった）ときだけ問い合わせる。
        //    数百m以上ずれた位置で別のセルを問い合わせないよう、ある程度正確な位置だけを使う
        if (loc.accuracy <= MAX_ACCURACY_FOR_CELL_M) {
            val cell = Grid.cellOf(loc.latitude, loc.longitude)
            if (cell.key != cellKey || (needsRefetch && now - lastFetchFailAt >= retryDelayMs())) {
                loadParks(cell, cfg, now)
            }
        }

        // 2. 生の位置で判定する
        updateExits(loc)                 // 退園：どの精度の位置でも「誤差を見込んでも外」なら数える
        if (accurate) updateEntries(loc) // 入園：精度のよい位置だけ
        updatePace(loc)

        // 3. 公園の中にいる間は、精度のよい位置をローカルに記録（生の位置）
        if (accurate && inside.isNotEmpty()) store.insertFix(loc, inside.keys)

        // 4. 取得間隔を切り替え（外 = 60秒 / 中 = 10秒〜60秒）
        setInterval(if (inside.isEmpty()) SLOW_INTERVAL_MS else inParkIntervalMs)

        emit(
            "ParkTrackerLocation",
            mapOf(
                "lat" to loc.latitude,
                "lng" to loc.longitude,
                "accuracy" to (if (loc.hasAccuracy()) loc.accuracy.toDouble() else -1.0),
                "time" to loc.time.toDouble(),
                "insideParkIds" to inside.keys.toList(),
                "intervalMs" to currentIntervalMs.toDouble(),
            ),
        )
    }

    /**
     * 退園：ジオメトリを「EXIT_BUFFER_M + 位置の誤差」だけ広げた範囲の外なら「外」と数え、
     * EXIT_CONFIRM_COUNT 回続いたら退園とする。
     * 精度の悪い位置（地下鉄や建物の中など）でも、誤差を見込んではっきり外なら数える。
     * 「中かもしれない」位置では、精度がよいときだけカウントを戻す（悪い位置ではどちらにも数えない）。
     */
    private fun updateExits(loc: Location) {
        if (inside.isEmpty()) return
        val lat = loc.latitude
        val lng = loc.longitude
        val exited = ArrayList<String>()
        for ((id, park) in inside) {
            if (!park.containsWithin(lat, lng, EXIT_BUFFER_M + loc.accuracy)) {
                val n = (outsideCounts[id] ?: 0) + 1
                if (n >= EXIT_CONFIRM_COUNT) exited += id else outsideCounts[id] = n
            } else if (loc.accuracy <= MAX_ACCURACY_M) {
                outsideCounts.remove(id)
            }
        }
        for (id in exited) {
            inside.remove(id)
            outsideCounts.remove(id)
            onExit(id, loc)
        }
    }

    /** 入園：サーバーのジオメトリそのままで判定する */
    private fun updateEntries(loc: Location) {
        for (park in parks) {
            if (!inside.containsKey(park.id) && park.contains(loc.latitude, loc.longitude)) {
                inside[park.id] = park
                outsideCounts.remove(park.id)
                onEnter(park)
            }
        }
    }

    /**
     * 公園の中で止まっていれば間隔を徐々に延ばし、大きく動いたら10秒に戻す。
     * 「動いた」の閾値は max(30m, 位置の誤差)。誤差の大きい位置でも、はっきり動いたときだけ戻す。
     */
    private fun updatePace(loc: Location) {
        if (inside.isEmpty()) {
            anchor = null
            stillCount = 0
            inParkIntervalMs = FAST_INTERVAL_MS
            return
        }
        val a = anchor
        if (a == null || loc.distanceTo(a) > max(MOVE_THRESHOLD_M, loc.accuracy)) {
            // 入園直後、または大きく動いた → 基準点を置き直して10秒に戻す
            anchor = loc
            stillCount = 0
            inParkIntervalMs = FAST_INTERVAL_MS
        } else {
            // 基準点の近くにとどまっている（基準点は動かさないので、ゆっくり歩いても距離は積み上がる）
            stillCount++
            if (stillCount >= STILL_FIXES_BEFORE_BACKOFF) {
                inParkIntervalMs = min(SLOW_INTERVAL_MS, (inParkIntervalMs * BACKOFF_FACTOR).toLong())
            }
        }
    }

    private fun loadParks(cell: Grid.Cell, cfg: Config, now: Long) {
        val cached = store.getParks(cell.key)
        if (cached != null && now - cached.fetchedAt < CACHE_TTL_MS) {
            // 最近問い合わせたセル → サーバーには送らない
            try {
                applyParks(GeoJson.parseParks(cached.body))
                cellKey = cell.key
                needsRefetch = false
                return
            } catch (e: Exception) {
                Log.w(TAG, "broken cache for ${cell.key}, refetching", e) // 壊れていたら取り直す
            }
        }
        try {
            val body = ParkApi.fetch(cfg, cell)
            val parsed = GeoJson.parseParks(body) // 壊れたレスポンスを保存しないよう先にパース
            store.putParks(cell.key, body, now)
            applyParks(parsed)
            needsRefetch = false
            fetchFailures = 0
            Log.d(TAG, "fetched ${parsed.size} parks for cell ${cell.key}")
        } catch (e: Exception) {
            Log.w(TAG, "fetch failed for cell ${cell.key}", e)
            lastFetchFailAt = now
            needsRefetch = true
            fetchFailures++
            // 期限切れのキャッシュがあればそれを使う。なければ直前のセルのジオメトリを使い続ける
            if (cached != null) {
                try { applyParks(GeoJson.parseParks(cached.body)) } catch (_: Exception) {}
            }
            emit("ParkTrackerError", mapOf("message" to "fetch failed: ${e.message}"))
        }
        cellKey = cell.key
    }

    /** 失敗が続くほど再試行の間隔を延ばす（60秒, 2分, 4分, … 最大30分） */
    private fun retryDelayMs(): Long {
        val shift = (fetchFailures - 1).coerceIn(0, 10)
        return min(FETCH_RETRY_MAX_MS, FETCH_RETRY_MS shl shift)
    }

    private fun applyParks(list: List<Park>) {
        parks = list
        // 中にいる公園のジオメトリがサーバー側で更新されていれば差し替える
        for (p in list) if (inside.containsKey(p.id)) inside[p.id] = p
    }

    private fun onEnter(park: Park) {
        // 「その日に一度入った公園は再通知しない」を DB で管理（サービスが再起動しても保たれる）
        val now = System.currentTimeMillis()
        val first = store.recordFirstVisitOfDay(park, today(now), now)
        if (first) notifyEnter(park)
        Log.d(TAG, "enter ${park.id} firstToday=$first")
        emit(
            "ParkTrackerEnter",
            mapOf("parkId" to park.id, "name" to park.name, "time" to now.toDouble(), "firstToday" to first),
        )
    }

    private fun onExit(parkId: String, loc: Location) {
        Log.d(TAG, "exit $parkId")
        emit("ParkTrackerExit", mapOf("parkId" to parkId, "time" to loc.time.toDouble()))
    }

    /** 端末のタイムゾーンでの日付（"その日" の区切り） */
    private fun today(now: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(now))

    private fun emit(name: String, body: Map<String, Any?>) {
        try { eventSink?.invoke(name, body) } catch (_: Exception) {}
    }

    // ------------------------------------------------------------------
    // 通知
    // ------------------------------------------------------------------

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(
            NotificationChannel(CH_TRACKING, "位置情報の記録", NotificationManager.IMPORTANCE_LOW),
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_ENTER, "公園に入ったとき", NotificationManager.IMPORTANCE_HIGH),
        )
    }

    private fun openAppIntent(requestCode: Int, parkId: String? = null): PendingIntent? {
        val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
        launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        if (parkId != null) launch.putExtra("parkTrackerParkId", parkId)
        return PendingIntent.getActivity(
            this, requestCode, launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun buildTrackingNotification() =
        NotificationCompat.Builder(this, CH_TRACKING)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation) // 本番では自前の白抜きモノクロアイコン（R.drawable.xxx）に差し替える
            .setContentTitle("近くの公園をチェック中")
            .setContentText("公園に入ると通知します")
            .setOngoing(true)
            .setContentIntent(openAppIntent(0))
            .build()

    @SuppressLint("MissingPermission")
    private fun notifyEnter(park: Park) {
        val nm = NotificationManagerCompat.from(this)
        if (!nm.areNotificationsEnabled()) return // Android 13+ で通知が許可されていない
        val n = NotificationCompat.Builder(this, CH_ENTER)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("${park.displayName}に入りました")
            .setContentText("タップしてアプリを開く")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openAppIntent(park.id.hashCode(), park.id))
            .build()
        try {
            nm.notify(ENTER_NOTIFICATION_TAG, park.id.hashCode(), n)
        } catch (e: SecurityException) {
            Log.w(TAG, "notify denied", e)
        }
    }
}
