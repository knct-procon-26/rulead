package expo.modules.parktracker

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleService
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.LocalModel
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabel
import com.google.mlkit.vision.label.ImageLabeler
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.custom.CustomImageLabelerOptions
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.google.mlkit.vision.objects.DetectedObject
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.ObjectDetector
import com.google.mlkit.vision.objects.custom.CustomObjectDetectorOptions
import java.util.concurrent.Executor
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * 外出中、ルールが登録された公園に入ったら自動でカメラを開き、映ったものを ML Kit（端末内のモデル）でラベリングして、
 * ラベルがその公園のルールのキーワードに一致したらルールを通知するフォアグラウンドサービス（type = camera）。
 *
 * なぜ外出の開始時から動かしておくのか:
 *   Android では、アプリが画面に出ていないときにカメラを使い始めるサービスを起動できない（カメラは「使用中のみ」の権限）。
 *   そこで「外出する」を押したとき（画面に出ているとき）にこのサービスを起動しておき、公園の外ではカメラを閉じて待機する。
 *   公園に入ったら ParkTrackerService が refresh() で知らせ、ここで端末内の公園の詳細を読んでカメラを開く。
 *
 *  - 見る公園 = いま中にいる公園のうち最後に入ったもの（ルールが1つもない公園ではカメラを開かない）
 *  - 公園の名前・ルールは端末に保存してあるもの（park_details）だけを使う。サーバーには問い合わせない
 *  - 画像は端末内で処理するだけで、保存も送信もしない。見つかったラベルだけを Store（sightings）に記録する（日記用）
 *  - 位置の記録（ParkTrackerService）が止まったら、このサービスも止まる
 *  - OS に止められたら自動では再開しない（START_NOT_STICKY）。アプリを開いたときに JS が startRuleWatch() し直す
 *  - 開発用に、公園とルールを直接渡して公園の外でも動かすモードがある（debugConfig。30分で自動停止）
 *
 * 電池のための間隔の調整（位置の取得間隔と同じ考え方）:
 *  - 基本は BASE_INTERVAL_MS に1枚だけ処理する（その間のフレームはすぐ捨てる）
 *  - 画面が真っ暗（ポケットやかばんの中）な状態が DARK_SAMPLES_BEFORE_BACKOFF 回続いたら、
 *    間隔を BACKOFF_FACTOR 倍ずつ MAX_INTERVAL_MS まで延ばし、その間はカメラ自体を止める。
 *    次の時刻にカメラを開き直し、露出が落ち着くのを待ってから1枚だけ明るさを調べる
 *  - 明るい画面が映ったらすぐに基本の間隔に戻し、カメラを動かし続ける
 *
 * スレッド:
 *  - カメラの bind / unbind、見る公園の切り替え、開始・停止・一時停止の処理は main スレッド
 *  - 画像の受け取り、明るさの判定、ML Kit の結果、DB の読み書きは専用の worker スレッド（下の worker 専用フィールドはロック不要）
 */
class RuleWatchService : LifecycleService() {

    companion object {
        private const val TAG = "RuleWatch"

        /** 開発用：公園とルールの JSON（WatchConfig.fromJson）。付いていなければ通常（外出）モード */
        const val EXTRA_DEBUG_CONFIG = "debugWatchConfig"
        const val ACTION_STOP = "expo.modules.parktracker.action.RULE_WATCH_STOP"

        // ---- 処理の間隔 ----
        private const val BASE_INTERVAL_MS = 10_000L       // 基本：何ミリ秒に1枚処理するか
        private const val MAX_INTERVAL_MS = 60_000L        // 真っ暗が続いたときの上限
        private const val BACKOFF_FACTOR = 1.5             // 真っ暗が続くと1回ごとにこの倍率で延ばす
        private const val DARK_SAMPLES_BEFORE_BACKOFF = 2  // 何回続けて真っ暗なら延ばし始めるか（手で一瞬ふさいだ程度では延ばさない）
        private const val DARK_MEAN_LUMA = 20              // 平均の明るさ（0〜255）がこれ未満なら「真っ暗」
        private const val WARMUP_MS = 1_000L               // カメラを開いてから露出が落ち着くまで、判定に使わない時間
        private const val REOPEN_LEAD_MS = 1_500L          // 次の判定時刻のこれだけ前にカメラを開き直す（起動＋露出待ちの分）
        private const val MIN_SUSPEND_MS = 1_000L          // これより短い一時停止はしない

        // ---- 判定 ----
        private const val RECORD_MIN_CONFIDENCE = 0.6f
        private const val ALERT_MIN_CONFIDENCE = 0.5f
        private const val INSTANT_ALERT_CONFIDENCE = 0.7f
        private const val LABELER_MIN_CONFIDENCE = 0.5f
        private const val CONFIRM_WINDOW_MS = 45_000L
        private const val ALERT_COOLDOWN_MS = 30L * 60 * 1000 // 同じ公園の同じルールを再通知するまでの間隔
        private const val DEBUG_MAX_DURATION_MS = 30L * 60 * 1000 // 開発用モードはこの時間で自動停止
        private val TARGET_SIZE = Size(640, 480)            // ラベリングには十分。大きくすると電池を食う

        private const val OBJECT_MODEL_ASSET = "object_labeler.tflite"
        private const val OBJECT_LABEL_OFFSET = 1000
        private const val OBJECT_MAX_LABELS = 3
        private const val SCENE_MAX_LABELS = 5
        private val BASE_LABEL_INDEXES = setOf(1, 20, 153, 191, 298, 328, 360, 398)

        // ---- 通知 ----
        private const val FG_NOTIFICATION_ID = 1002         // ParkTrackerService は 1001
        private const val CH_WATCH = "rule_watch"
        private const val CH_ALERT = "rule_alert"
        private const val ALERT_NOTIFICATION_TAG = "rule_alert"
        private const val RC_OPEN = 1_002
        private const val RC_STOP = 1_003

        /** 動作中のインスタンス（startForeground に成功してから onDestroy まで） */
        @Volatile private var current: RuleWatchService? = null

        val isRunning: Boolean get() = current != null

        /** JS の getRuleWatchStatus() 用 */
        fun status(): Map<String, Any?> {
            val s = current
            val c = s?.activeConfig
            return mapOf(
                "running" to (s != null),
                "cameraActive" to (c != null),
                "parkId" to c?.parkId,
                "parkName" to c?.parkName,
                "debug" to (s?.debugConfig != null),
            )
        }

        /** 入っている公園・公園のデータが変わったとき（ParkTrackerService の worker スレッドから呼ばれる） */
        fun refresh() {
            current?.requestRefresh()
        }

        /** 位置の記録（ParkTrackerService）が止まったとき。公園の中にいるか判断できなくなるので止める（開発用モードは除く） */
        fun onTrackerStopped() {
            val s = current ?: return
            s.mainHandler.post { if (s.debugConfig == null) s.stopWith("tracker_stopped") }
        }

        /** 通知の文言（UiTexts）が変わったとき。チャンネル名と常駐通知を今の言語で作り直す */
        fun onTextsChanged() {
            val s = current ?: return
            s.mainHandler.post {
                s.createChannels()
                s.updateNotification()
            }
        }

        /** JS の stopRuleWatch() 用。動作中なら true */
        fun requestStop(): Boolean {
            val s = current ?: return false
            s.mainHandler.post { s.stopWith("user") }
            return true
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var store: Store
    private lateinit var worker: HandlerThread
    private lateinit var workerHandler: Handler
    /** worker スレッドで実行する Executor。スレッド終了後に積まれた処理は（例外にせず）捨てる */
    private lateinit var workerExecutor: Executor
    private lateinit var labeler: ImageLabeler
    private var objectLabeler: ImageLabeler? = null
    private var objectDetector: ObjectDetector? = null

    private data class Seen(val index: Int, val text: String, val confidence: Float)

    /** 開発用モードの公園（通常は null）。main で書き、worker で読む */
    @Volatile private var debugConfig: WatchConfig? = null
    /** いま見ている公園（null ならカメラは閉じている）。main で書き、worker で読む */
    @Volatile private var activeConfig: WatchConfig? = null
    @Volatile private var alive = false
    /** 見る公園が変わるたびに main で増やす。worker はこれが変わったら間隔などの状態を初期化する */
    @Volatile private var epoch = 0
    /** カメラを bind するたびに main で増やす。worker はこれが変わったら露出待ち（WARMUP_MS）から始める */
    @Volatile private var bindGeneration = 0

    // ---- main スレッドからしか触らない ----
    private var cameraRequested = false
    private var cameraProvider: ProcessCameraProvider? = null
    private var analysis: ImageAnalysis? = null
    private var suspended = false
    private var stopReason = "stopped"
    private val timeout = Runnable { stopWith("timeout") }
    private val resumeCamera = Runnable {
        suspended = false
        if (alive && activeConfig != null) bindAnalysis()
    }

    // ---- worker スレッドからしか触らない ----
    private var busy = false
    private var seenEpoch = -1
    private var seenGeneration = -1
    private var warmupUntil = 0L        // elapsedRealtime。これより前のフレームは判定に使わない
    private var nextSampleAt = 0L       // elapsedRealtime。次にフレームを調べる時刻
    private var intervalMs = BASE_INTERVAL_MS
    private var darkCount = 0
    private val lastHitAt = HashMap<String, Long>()

    override fun onCreate() {
        super.onCreate()
        store = Store.get(this)
        worker = HandlerThread("rule-watch").also { it.start() }
        workerHandler = Handler(worker.looper)
        workerExecutor = Executor { r ->
            if (!workerHandler.post(r)) Log.d(TAG, "worker is gone; task dropped")
        }
        labeler = ImageLabeling.getClient(
            ImageLabelerOptions.Builder().setConfidenceThreshold(LABELER_MIN_CONFIDENCE).build(),
        )
        try {
            val model = LocalModel.Builder().setAssetFilePath(OBJECT_MODEL_ASSET).build()
            objectLabeler = ImageLabeling.getClient(
                CustomImageLabelerOptions.Builder(model)
                    .setConfidenceThreshold(LABELER_MIN_CONFIDENCE)
                    .setMaxResultCount(SCENE_MAX_LABELS)
                    .build(),
            )
            objectDetector = ObjectDetection.getClient(
                CustomObjectDetectorOptions.Builder(model)
                    .setDetectorMode(CustomObjectDetectorOptions.SINGLE_IMAGE_MODE)
                    .enableMultipleObjects()
                    .enableClassification()
                    .setClassificationConfidenceThreshold(LABELER_MIN_CONFIDENCE)
                    .setMaxPerObjectLabelCount(OBJECT_MAX_LABELS)
                    .build(),
            )
        } catch (e: Exception) {
            Log.w(TAG, "object model unavailable", e)
        }
        createChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        if (intent?.action == ACTION_STOP) {
            // 通知の「外出を終える」／開発用モードの「停止」
            if (debugConfig == null && current === this) endOuting()
            stopWith("user")
            return START_NOT_STICKY
        }
        if (intent == null) {
            // OS による再起動。カメラはバックグラウンドから開始できないので再開しない（動作中ならそのまま続ける）
            if (current !== this) stopSelf()
            return START_NOT_STICKY
        }

        val debug = intent.getStringExtra(EXTRA_DEBUG_CONFIG)?.let { json ->
            try {
                WatchConfig.fromJson(json)
            } catch (e: Exception) {
                Log.w(TAG, "broken debug config", e)
                null
            }
        }
        debugConfig = debug

        // startForegroundService で起動されたら、何よりも先に startForeground を呼ぶ
        if (!enterForeground()) {
            stopWith("error")
            return START_NOT_STICKY
        }
        alive = true
        current = this

        mainHandler.removeCallbacks(timeout)
        if (debug != null) mainHandler.postDelayed(timeout, DEBUG_MAX_DURATION_MS)

        if (!cameraRequested) {
            cameraRequested = true
            prepareCamera()
        }
        requestRefresh()
        Log.d(TAG, if (debug != null) "started (debug park ${debug.parkId})" else "started (outing)")
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        alive = false
        if (current === this) current = null
        mainHandler.removeCallbacksAndMessages(null) // timeout / resumeCamera / 公園の切り替え・一時停止の依頼をすべて取り消す

        unbindAnalysis()
        cameraProvider = null

        // 処理中の ML Kit のタスクがあっても、worker の列の最後で閉じる（結果の処理は alive=false で捨てられる）
        workerHandler.post {
            try { labeler.close() } catch (_: Exception) {}
            try { objectLabeler?.close() } catch (_: Exception) {}
            try { objectDetector?.close() } catch (_: Exception) {}
        }
        worker.quitSafely()

        emit(ParkTrackerModule.EVENT_WATCH_STOPPED, mapOf("reason" to stopReason))
        Log.d(TAG, "stopped: $stopReason")
        super.onDestroy()
    }

    // ------------------------------------------------------------------
    // 開始・停止・見る公園の切り替え（main スレッド）
    // ------------------------------------------------------------------

    private fun enterForeground(): Boolean {
        // Android 14+ では、カメラの権限がないと type=camera の startForeground が SecurityException になる
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "CAMERA permission is missing")
            return false
        }
        return try {
            val notification = buildWatchNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                startForeground(FG_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA)
            } else {
                startForeground(FG_NOTIFICATION_ID, notification)
            }
            true
        } catch (e: Exception) {
            // バックグラウンドからの開始（Android 12+）など
            Log.e(TAG, "startForeground failed", e)
            false
        }
    }

    private fun stopWith(reason: String) {
        stopReason = reason
        stopSelf()
    }

    /** 通知の「外出を終える」：位置の記録も止め、OS による再開もさせない（JS の stop() と同じ） */
    private fun endOuting() {
        Config.clear(this)
        Outing.clear(this)
        try {
            stopService(Intent(this, ParkTrackerService::class.java))
        } catch (e: Exception) {
            Log.w(TAG, "stop tracker failed", e)
        }
    }

    /** 見る公園を選び直す（DB を読むので worker で行い、結果を main に渡す） */
    private fun requestRefresh() {
        workerHandler.post {
            if (!alive) return@post
            val cfg = debugConfig ?: currentParkConfig()
            mainHandler.post { applyConfig(cfg) }
        }
    }

    /** worker：いま中にいる公園のうち最後に入ったもの。ルールが無い・端末にデータが無ければ null */
    private fun currentParkConfig(): WatchConfig? {
        val target = ParkTrackerService.insideParks.maxByOrNull { it.enteredAt } ?: return null
        return try {
            val d = store.getParkDetails(target.id) ?: return null
            WatchConfig.forPark(target.id, d.name.ifEmpty { target.name }, d.rulesJson)
                .takeIf { it.rules.isNotEmpty() }
        } catch (e: Exception) {
            Log.w(TAG, "cannot read park ${target.id}", e)
            null
        }
    }

    /** main：見る公園を切り替える。null ならカメラを閉じて待機する */
    private fun applyConfig(cfg: WatchConfig?) {
        if (!alive || cfg == activeConfig) return
        val parkChanged = cfg?.parkId != activeConfig?.parkId
        activeConfig = cfg
        epoch++ // worker が次のフレームで間隔・誤検出の記録を初期化する
        if (cfg == null) {
            mainHandler.removeCallbacks(resumeCamera)
            suspended = false
            unbindAnalysis()
            Log.d(TAG, "camera closed (no park to watch)")
        } else if (suspended) {
            // 真っ暗で一時停止中に公園が変わった → すぐに開き直す
            mainHandler.removeCallbacks(resumeCamera)
            resumeCamera.run()
        } else {
            bindAnalysis() // 準備中・bind 済みなら何もしない
        }
        if (parkChanged) updateNotification()
        Log.d(TAG, "watching: ${cfg?.parkId ?: "none"}")
    }

    /** CameraProvider を用意する（最初の1回だけ）。用意できた時点で見る公園があれば bind する */
    private fun prepareCamera() {
        val future = try {
            ProcessCameraProvider.getInstance(this)
        } catch (e: Exception) {
            onCameraError(e)
            return
        }
        future.addListener({
            if (!alive) return@addListener // 準備中に停止された
            try {
                cameraProvider = future.get()
            } catch (e: Exception) {
                onCameraError(e)
                return@addListener
            }
            if (activeConfig != null && !suspended) bindAnalysis()
        }, ContextCompat.getMainExecutor(this))
    }

    /** ImageAnalysis を作って bind する（公園に入ったときと、一時停止からの再開時） */
    private fun bindAnalysis() {
        val provider = cameraProvider ?: return
        if (analysis != null) return
        try {
            val a = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .setResolutionSelector(
                    ResolutionSelector.Builder()
                        .setResolutionStrategy(
                            ResolutionStrategy(TARGET_SIZE, ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER),
                        )
                        .build(),
                )
                .build()
            a.setAnalyzer(workerExecutor) { image -> analyze(image) }
            bindGeneration++ // この bind 以降の最初のフレームから露出待ちを数える
            // このサービスのライフサイクルに結びつける（onDestroy で自動的に解除される）
            provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, a)
            analysis = a
            Log.d(TAG, "camera bound")
        } catch (e: Exception) {
            // 背面カメラがない、など
            onCameraError(e)
        }
    }

    private fun unbindAnalysis() {
        val a = analysis ?: return
        analysis = null
        a.clearAnalyzer()
        try {
            cameraProvider?.unbind(a)
        } catch (e: Exception) {
            Log.w(TAG, "unbind failed", e)
        }
    }

    /**
     * 真っ暗が続いているので、delayMs の間カメラを止める（worker から依頼される）。
     * 依頼の後に見る公園が変わっていたら（epoch が違えば）何もしない。
     */
    private fun suspendCamera(delayMs: Long, requestEpoch: Int) {
        if (!alive || suspended || requestEpoch != epoch || analysis == null) return
        if (delayMs < MIN_SUSPEND_MS) return
        unbindAnalysis()
        suspended = true
        mainHandler.postDelayed(resumeCamera, delayMs)
        Log.d(TAG, "camera paused for ${delayMs / 1000.0}s (dark)")
    }

    private fun onCameraError(e: Exception) {
        Log.e(TAG, "camera failed", e)
        emit(ParkTrackerModule.EVENT_ERROR, mapOf("message" to "camera failed: ${e.message}"))
        stopWith("error")
    }

    // ------------------------------------------------------------------
    // 画像処理（worker スレッド）
    // ------------------------------------------------------------------

    /** CameraX から毎フレーム呼ばれる。調べる時刻のフレームだけを使い、それ以外はすぐ捨てる */
    private fun analyze(image: ImageProxy) {
        try {
            if (!alive || busy) return
            val cfg = activeConfig ?: return
            val now = SystemClock.elapsedRealtime()

            // 見る公園が変わった → 間隔と誤検出の記録を初期化して、すぐに調べる
            val e = epoch
            if (e != seenEpoch) {
                seenEpoch = e
                intervalMs = BASE_INTERVAL_MS
                darkCount = 0
                nextSampleAt = 0L
                lastHitAt.clear()
            }
            // カメラを開いた直後は露出が合っておらず暗く写るので、しばらく判定に使わない
            val g = bindGeneration
            if (g != seenGeneration) {
                seenGeneration = g
                warmupUntil = now + WARMUP_MS
                return
            }
            if (now < warmupUntil || now < nextSampleAt) return

            if (isDark(image)) {
                onDark(now, e)
                return
            }

            // 明るい → 基本の間隔に戻してラベリング
            if (intervalMs != BASE_INTERVAL_MS) Log.d(TAG, "bright again; interval = ${BASE_INTERVAL_MS / 1000}s")
            darkCount = 0
            intervalMs = BASE_INTERVAL_MS
            nextSampleAt = now + intervalMs

            // Bitmap にコピーしてから ML Kit に渡すので、ImageProxy はすぐ閉じてよい（finally）
            val input = InputImage.fromBitmap(image.toBitmap(), image.imageInfo.rotationDegrees)
            busy = true
            val base = labeler.process(input)
            val scene = objectLabeler?.process(input)
            val objects = objectDetector?.process(input)
            Tasks.whenAllComplete(listOfNotNull<Task<*>>(base, scene, objects))
                .addOnCompleteListener(workerExecutor) {
                    try {
                        onLabels(cfg, collect(base, scene, objects))
                    } catch (ex: Exception) {
                        Log.e(TAG, "onLabels failed", ex)
                    } finally {
                        busy = false
                    }
                }
        } catch (ex: Exception) {
            busy = false
            Log.w(TAG, "analyze failed", ex)
        } finally {
            image.close()
        }
    }

    /** 真っ暗だった。続いていれば間隔を延ばし、次の時刻までカメラを止めてもらう */
    private fun onDark(now: Long, e: Int) {
        darkCount++
        if (darkCount >= DARK_SAMPLES_BEFORE_BACKOFF) {
            intervalMs = min(MAX_INTERVAL_MS, (intervalMs * BACKOFF_FACTOR).toLong())
        }
        nextSampleAt = now + intervalMs
        if (intervalMs > BASE_INTERVAL_MS) {
            // 次の判定時刻に間に合うよう、少し前にカメラを開き直す
            val delay = intervalMs - REOPEN_LEAD_MS
            mainHandler.post { suspendCamera(delay, e) }
        }
        Log.d(TAG, "dark x$darkCount; next check in ${intervalMs / 1000.0}s")
    }

    /**
     * フレームの平均の明るさ（0〜255）が DARK_MEAN_LUMA 未満か。
     * RGBA_8888 のフレームから間引いた点だけを調べる（全画素は読まない）。
     * 読めない形式のときは「暗くない」とみなす（ラベリングはする）。
     */
    private fun isDark(image: ImageProxy): Boolean {
        return try {
            val plane = image.planes.firstOrNull() ?: return false
            val buf = plane.buffer
            val rowStride = plane.rowStride
            val pixelStride = plane.pixelStride
            if (pixelStride < 3) return false
            val w = image.width
            val h = image.height
            val step = max(1, min(w, h) / 24)
            val limit = buf.limit()
            var sum = 0L
            var n = 0
            var y = step / 2
            while (y < h) {
                var x = step / 2
                while (x < w) {
                    val i = y * rowStride + x * pixelStride
                    if (i + 2 < limit) {
                        // buf.get(index) は position を動かさないので、後の toBitmap() に影響しない
                        val r = buf.get(i).toInt() and 0xFF
                        val gr = buf.get(i + 1).toInt() and 0xFF
                        val b = buf.get(i + 2).toInt() and 0xFF
                        sum += (r * 299 + gr * 587 + b * 114) / 1000
                        n++
                    }
                    x += step
                }
                y += step
            }
            n > 0 && sum / n < DARK_MEAN_LUMA
        } catch (e: Exception) {
            Log.w(TAG, "brightness check failed", e)
            false
        }
    }

    private fun collect(
        base: Task<List<ImageLabel>>,
        scene: Task<List<ImageLabel>>?,
        objects: Task<List<DetectedObject>>?,
    ): List<Seen> {
        val best = LinkedHashMap<Int, Seen>()
        fun add(index: Int, text: String?, confidence: Float) {
            val prev = best[index]
            if (prev == null || confidence > prev.confidence) best[index] = Seen(index, text ?: "", confidence)
        }
        if (base.isSuccessful) {
            for (l in base.result.orEmpty()) {
                if (l.index in BASE_LABEL_INDEXES) add(l.index, l.text, l.confidence)
            }
        } else {
            Log.w(TAG, "labeling failed", base.exception)
        }
        if (scene != null) {
            if (scene.isSuccessful) {
                for (l in scene.result.orEmpty()) {
                    if (l.index >= 0) add(OBJECT_LABEL_OFFSET + l.index, l.text, l.confidence)
                }
            } else {
                Log.w(TAG, "scene labeling failed", scene.exception)
            }
        }
        if (objects != null) {
            if (objects.isSuccessful) {
                for (o in objects.result.orEmpty()) {
                    for (l in o.labels) {
                        if (l.index >= 0) add(OBJECT_LABEL_OFFSET + l.index, l.text, l.confidence)
                    }
                }
            } else {
                Log.w(TAG, "object detection failed", objects.exception)
            }
        }
        return best.values.toList()
    }

    private fun onLabels(cfg: WatchConfig, labels: List<Seen>) {
        if (!alive) return
        val seen = labels.filter { it.confidence >= LABELER_MIN_CONFIDENCE }
        if (seen.isEmpty()) return
        val now = System.currentTimeMillis()

        val found = seen.filter { it.confidence >= RECORD_MIN_CONFIDENCE }
        if (found.isNotEmpty()) {
            store.recordSightings(
                cfg.parkId, cfg.parkName, Store.dayOf(now),
                found.map { Store.SeenLabel(it.index, it.text, it.confidence) },
                now,
            )
            emit(
                ParkTrackerModule.EVENT_WATCH_LABELS,
                mapOf(
                    "parkId" to cfg.parkId,
                    "time" to now.toDouble(),
                    "labels" to found.map {
                        mapOf("index" to it.index, "label" to it.text, "confidence" to it.confidence.toDouble())
                    },
                ),
            )
        }

        val elapsed = SystemClock.elapsedRealtime()
        for (rule in cfg.rules) {
            val hit = seen
                .filter { it.confidence >= ALERT_MIN_CONFIDENCE && rule.matches(it.index, it.text) }
                .maxByOrNull { it.confidence } ?: continue
            val previousHit = lastHitAt.put(rule.id, elapsed)
            // はっきり見えたら1回で通知する。そうでなければ、1回だけの誤検出で通知しないよう
            // CONFIRM_WINDOW_MS 以内に2回見えたときだけ進む
            val confirmed = hit.confidence >= INSTANT_ALERT_CONFIDENCE ||
                (previousHit != null && elapsed - previousHit <= CONFIRM_WINDOW_MS)
            if (!confirmed) continue
            // 再通知の間隔は DB で管理する（見守りを開始し直しても連続で通知しない）
            val lastAlert = store.lastRuleAlertAt(cfg.parkId, rule.id)
            if (lastAlert != null && abs(now - lastAlert) < ALERT_COOLDOWN_MS) continue
            onAlert(cfg, rule, hit, now)
        }
    }

    private fun onAlert(cfg: WatchConfig, rule: WatchRule, hit: Seen, now: Long) {
        val label = rule.keywords.firstOrNull { it.index == hit.index && it.label.isNotEmpty() }?.label ?: hit.text
        // 先に記録する（通知が出せなくても再通知の間隔は守る）
        store.insertRuleAlert(
            Store.RuleAlert(cfg.parkId, cfg.parkName, rule.id, rule.text, hit.index, label, hit.confidence, now),
        )
        notifyAlert(cfg, rule, label)
        Log.d(TAG, "alert rule=${rule.id} label=$label (${hit.confidence})")
        emit(
            ParkTrackerModule.EVENT_WATCH_ALERT,
            mapOf(
                "parkId" to cfg.parkId,
                "parkName" to cfg.parkName,
                "ruleId" to rule.id,
                "ruleText" to rule.text,
                "labelIndex" to hit.index,
                "label" to label,
                "confidence" to hit.confidence.toDouble(),
                "time" to now.toDouble(),
            ),
        )
    }

    private fun emit(name: String, body: Map<String, Any?>) {
        try { ParkTrackerService.eventSink?.invoke(name, body) } catch (_: Exception) {}
    }

    // ------------------------------------------------------------------
    // 通知
    // ------------------------------------------------------------------

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(
            NotificationChannel(CH_WATCH, UiTexts.get(this, "channelWatch"), NotificationManager.IMPORTANCE_LOW),
        )
        nm.createNotificationChannel(
            NotificationChannel(CH_ALERT, UiTexts.get(this, "channelAlert"), NotificationManager.IMPORTANCE_HIGH),
        )
    }

    private fun stopPendingIntent(): PendingIntent =
        PendingIntent.getService(
            this, RC_STOP,
            Intent(this, RuleWatchService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    /** 常駐通知（見ている公園によって文面が変わる。main スレッドから呼ぶ） */
    private fun buildWatchNotification() = run {
        val cfg = activeConfig
        val debug = debugConfig != null
        NotificationCompat.Builder(this, CH_WATCH)
            .setSmallIcon(R.drawable.ic_stat_rulead)
            .setContentTitle(
                if (cfg != null) UiTexts.get(this, "watchingTitle", "park" to UiTexts.parkName(this, cfg.parkName))
                else UiTexts.get(this, "watchIdleTitle"),
            )
            .setContentText(
                if (cfg != null) UiTexts.get(this, "watchingText")
                else UiTexts.get(this, "watchIdleText"),
            )
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(AppLinks.rulesPendingIntent(this, RC_OPEN, cfg?.parkId))
            .addAction(0, UiTexts.get(this, if (debug) "watchStop" else "endOuting"), stopPendingIntent())
            .build()
    }

    @SuppressLint("MissingPermission")
    private fun updateNotification() {
        if (!alive) return
        try {
            NotificationManagerCompat.from(this).notify(FG_NOTIFICATION_ID, buildWatchNotification())
        } catch (e: SecurityException) {
            Log.w(TAG, "notify denied", e)
        }
    }

    @SuppressLint("MissingPermission")
    private fun notifyAlert(cfg: WatchConfig, rule: WatchRule, label: String) {
        val nm = NotificationManagerCompat.from(this)
        if (!nm.areNotificationsEnabled()) return // Android 13+ で通知が許可されていない
        val title = UiTexts.get(this, "alertTitle", "park" to UiTexts.parkName(this, cfg.parkName))
        // 本文は外出を始めたときに選んでいた言語の翻訳（無ければ英語の原文）
        val text = rule.displayText
        val body = "$text\n${UiTexts.get(this, "alertSeenTap", "label" to label)}"
        val builder = NotificationCompat.Builder(this, CH_ALERT)
            .setSmallIcon(R.drawable.ic_stat_rulead)
            .setContentTitle(title)
            .setContentText(text.ifEmpty { UiTexts.get(this, "alertSeen", "label" to label) })
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
        // ルールのピクトグラムを大きいアイコンに（描けなければ付けない）
        RuleIconBitmap.forRule(this, rule)?.let { builder.setLargeIcon(it) }
        val n = builder
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(AppLinks.rulesPendingIntent(this, "alert:${rule.id}".hashCode(), cfg.parkId, rule.id))
            .build()
        try {
            nm.notify(ALERT_NOTIFICATION_TAG, rule.id.hashCode(), n)
        } catch (e: SecurityException) {
            Log.w(TAG, "notify denied", e)
        }
    }
}
