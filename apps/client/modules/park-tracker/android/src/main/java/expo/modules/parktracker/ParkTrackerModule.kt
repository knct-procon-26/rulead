package expo.modules.parktracker

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** JS から渡される start() の引数 */
class StartOptions : Record {
    @Field var apiUrl: String = ""
    @Field var headers: Map<String, String> = emptyMap()
    /** true: 新しい外出を始める（出発地点に戻ったら自動で止まる）。false: 外出の状態はそのまま（再開・トークン更新用） */
    @Field var outing: Boolean = false
}

/**
 * JS から呼べる窓口（Expo Modules API）。JS 側では requireNativeModule('ParkTracker') で取得する。
 *  - AsyncFunction は JS では Promise を返す関数になる。本体は Expo の専用スレッドで実行されるので、DB を読んでもよい
 *  - CodedException を投げると、JS 側では error.code にそのコードが入った例外になる
 *  - sendEvent でネイティブ → JS にイベントを送る（Events に名前を登録したものだけ）
 */
class ParkTrackerModule : Module() {

    companion object {
        const val EVENT_LOCATION = "ParkTrackerLocation"
        const val EVENT_ENTER = "ParkTrackerEnter"
        const val EVENT_EXIT = "ParkTrackerExit"
        const val EVENT_ERROR = "ParkTrackerError"
        const val EVENT_OUTING_ENDED = "ParkTrackerOutingEnded"

        // カメラでの見守り（RuleWatchService）
        const val EVENT_WATCH_LABELS = "RuleWatchLabels"
        const val EVENT_WATCH_ALERT = "RuleWatchAlert"
        const val EVENT_WATCH_STOPPED = "RuleWatchStopped"
    }

    private val context: Context
        get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

    /** サービスからのイベントを JS へ流す。JS が終了処理中などで送れないときは捨てる（通知と記録はネイティブ側で済んでいる） */
    private val sink: (String, Map<String, Any?>) -> Unit = { name, body ->
        try {
            sendEvent(name, body)
        } catch (_: Exception) {
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ParkTracker")

        Events(
            EVENT_LOCATION, EVENT_ENTER, EVENT_EXIT, EVENT_ERROR, EVENT_OUTING_ENDED,
            EVENT_WATCH_LABELS, EVENT_WATCH_ALERT, EVENT_WATCH_STOPPED,
        )

        OnCreate {
            ParkTrackerService.eventSink = sink
        }

        OnDestroy {
            // リロード時に新しいモジュールが先に登録していたら消さない
            if (ParkTrackerService.eventSink === sink) ParkTrackerService.eventSink = null
        }

        /** start({ apiUrl, headers? })。必ずアプリが画面に表示されているときに呼ぶこと。 */
        AsyncFunction("start") { options: StartOptions ->
            if (options.apiUrl.isEmpty()) {
                throw CodedException("E_CONFIG", "apiUrl is required", null)
            }
            val ctx = context
            // 正確な位置の権限がないと、Android 14+ では startForeground が失敗する
            if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                throw CodedException("E_PERMISSION", "ACCESS_FINE_LOCATION is not granted", null)
            }
            // 新しい外出：サービスが状態を読む前に保存しておく（出発地点は最初の精度のよい位置で決まる）
            if (options.outing) Outing.begin(ctx, System.currentTimeMillis())
            val intent = Intent(ctx, ParkTrackerService::class.java)
                .putExtra(ParkTrackerService.EXTRA_CONFIG, Config(options.apiUrl, options.headers).toJson())
            try {
                ContextCompat.startForegroundService(ctx, intent)
            } catch (e: Exception) {
                if (options.outing) Outing.clear(ctx) // 始まらなかった外出の状態を残さない
                // Android 12+ でバックグラウンドから呼ぶと ForegroundServiceStartNotAllowedException
                throw CodedException("E_START", e.message ?: e.toString(), e)
            }
        }

        /** 停止する（外出も終える）。カメラでの見守りも位置の記録の停止に合わせて止まる */
        AsyncFunction("stop") {
            val ctx = context
            Config.clear(ctx) // OS による自動再起動もさせない
            Outing.clear(ctx)
            ctx.stopService(Intent(ctx, ParkTrackerService::class.java))
        }

        /** 外出中か。active = 外出を始めていて、まだ終えていない（位置の記録が OS に止められていても true） */
        AsyncFunction("getOutingStatus") {
            val ctx = context
            val o = Outing.load(ctx)
            val active = o != null && Config.load(ctx) != null
            mapOf(
                "active" to active,
                "startedAt" to (if (active) o?.startedAt?.toDouble() else null),
                "homeSet" to (active && o?.hasHome == true),
                "leftHome" to (active && o?.leftHome == true),
            )
        }

        AsyncFunction("isRunning") {
            ParkTrackerService.isRunning
        }

        /**
         * start() 済みで stop() されていないか（＝ユーザーは記録を望んでいるか）。
         * 再起動や OS による停止でサービスが止まっていても true のまま。isRunning() と組み合わせて再開の判断に使う。
         */
        AsyncFunction("isEnabled") {
            Config.load(context) != null
        }

        /** いま中にいる公園（入った順）。記録が止まっているときは空 */
        AsyncFunction("getCurrentParks") {
            ParkTrackerService.insideParks.map { p ->
                mapOf(
                    "parkId" to p.id,
                    "name" to p.name,
                    "enteredAt" to p.enteredAt.toDouble(),
                )
            }
        }

        /**
         * 端末に保存してある公園の詳細（まわりの公園を取得したときに一緒に受け取ったもの）。無ければ null。
         * サーバーには問い合わせない。rulesJson はサーバーの RuleResult[] の JSON 文字列（JS 側で解釈する）。
         */
        AsyncFunction("getParkDetails") { parkId: String ->
            Store.get(context).getParkDetails(parkId)?.let { d ->
                mapOf(
                    "parkId" to d.parkId,
                    "name" to d.name,
                    "address" to d.address,
                    "rulesJson" to d.rulesJson,
                    "fetchedAt" to d.fetchedAt.toDouble(),
                )
            }
        }

        /**
         * まわりの公園とルールを、次に位置を取得したときにサーバーから取り直させる（看板を登録した直後などに呼ぶ）。
         * 送るのはいつもと同じ約1kmセルの中心だけ。記録が止まっていれば、次に開始したときに取得される。
         */
        AsyncFunction("refreshParks") {
            Store.get(context).clearParksCache()
            ParkTrackerService.refreshRequested = true
            Unit
        }

        /** 公園内で記録した位置。from 以上 to 未満（UNIX ミリ秒）。 */
        AsyncFunction("getTrack") { from: Double, to: Double ->
            Store.get(context).queryFixes(from.toLong(), to.toLong()).map { f ->
                mapOf(
                    "time" to f.time.toDouble(),
                    "lat" to f.lat,
                    "lng" to f.lng,
                    "accuracy" to f.accuracy.toDouble(),
                    "parkIds" to f.parkIds.split(",").filter { it.isNotEmpty() },
                )
            }
        }

        /** before（UNIX ミリ秒）より古い位置の記録を消す。消した件数を返す。 */
        AsyncFunction("clearTrack") { before: Double ->
            Store.get(context).deleteFixesBefore(before.toLong())
        }

        /** その日初めて入った公園の履歴。入園時刻が from 以上 to 未満（UNIX ミリ秒）。 */
        AsyncFunction("getVisits") { from: Double, to: Double ->
            Store.get(context).queryVisits(from.toLong(), to.toLong()).map { v ->
                mapOf(
                    "parkId" to v.parkId,
                    "name" to v.name,
                    "day" to v.day,
                    "enteredAt" to v.enteredAt.toDouble(),
                )
            }
        }

        /** before より古い履歴を消す（通知済みの記録は残るので、今日の再通知は起きない）。消した件数を返す。 */
        AsyncFunction("clearVisits") { before: Double ->
            Store.get(context).deleteVisitsBefore(before.toLong())
        }

        /** 電池の最適化の設定画面を開く（メーカーの省電力でサービスが止められる対策の案内用） */
        AsyncFunction("openBatterySettings") {
            val i = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(i)
            } catch (_: Exception) {
            }
        }

        // ------------------------------------------------------------------
        // カメラでの見守り（ML Kit）
        // ------------------------------------------------------------------

        /**
         * startRuleWatch(debugConfigJson)。
         *  - "" : 通常（外出）モード。位置の記録中に呼ぶ。ルールのある公園に入ると自動でカメラを開き、出ると閉じる
         *  - JSON: 開発用。{ parkId, parkName, rules } の公園を、公園の外でも見守る（30分で自動停止）
         * 必ずアプリが画面に表示されているときに呼ぶこと（カメラは「使用中のみ」の権限のため）。
         * 動作中にもう一度呼ぶと、モードが差し替わる。
         * エラーコード: E_CONFIG / E_PERMISSION（カメラ）/ E_NOT_TRACKING（位置の記録が止まっている）/ E_START
         */
        AsyncFunction("startRuleWatch") { debugConfigJson: String ->
            val debug = if (debugConfigJson.isEmpty()) {
                null
            } else {
                try {
                    WatchConfig.fromJson(debugConfigJson)
                } catch (e: Exception) {
                    throw CodedException("E_CONFIG", "invalid watch config: ${e.message}", e)
                }
            }
            val ctx = context
            if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                throw CodedException("E_PERMISSION", "CAMERA is not granted", null)
            }
            if (debug == null && !ParkTrackerService.isRunning) {
                throw CodedException("E_NOT_TRACKING", "park tracker is not running", null)
            }
            val intent = Intent(ctx, RuleWatchService::class.java)
            if (debug != null) intent.putExtra(RuleWatchService.EXTRA_DEBUG_CONFIG, debug.toJson())
            try {
                ContextCompat.startForegroundService(ctx, intent)
            } catch (e: Exception) {
                throw CodedException("E_START", e.message ?: e.toString(), e)
            }
        }

        /** 見守りを止める。動いていなければ何もしない */
        AsyncFunction("stopRuleWatch") {
            RuleWatchService.requestStop()
            Unit
        }

        /** { running, cameraActive, parkId, parkName, debug } */
        AsyncFunction("getRuleWatchStatus") {
            RuleWatchService.status()
        }

        /** カメラで見つかったもの（公園 × 日 × ラベルで1件）。from 以上 to 未満の間に見えていたもの */
        AsyncFunction("getSightings") { from: Double, to: Double ->
            Store.get(context).querySightings(from.toLong(), to.toLong()).map { s ->
                mapOf(
                    "parkId" to s.parkId,
                    "parkName" to s.parkName,
                    "day" to s.day,
                    "labelIndex" to s.labelIndex,
                    "label" to s.label,
                    "count" to s.count,
                    "firstSeen" to s.firstSeen.toDouble(),
                    "lastSeen" to s.lastSeen.toDouble(),
                    "maxConfidence" to s.maxConfidence.toDouble(),
                )
            }
        }

        /** 最後に見たのが before より前のものを消す。消した件数を返す */
        AsyncFunction("clearSightings") { before: Double ->
            Store.get(context).deleteSightingsBefore(before.toLong())
        }

        /** ルールの通知の記録。通知時刻が from 以上 to 未満 */
        AsyncFunction("getRuleAlerts") { from: Double, to: Double ->
            Store.get(context).queryRuleAlerts(from.toLong(), to.toLong()).map { a ->
                mapOf(
                    "parkId" to a.parkId,
                    "parkName" to a.parkName,
                    "ruleId" to a.ruleId,
                    "ruleText" to a.ruleText,
                    "labelIndex" to a.labelIndex,
                    "label" to a.label,
                    "confidence" to a.confidence.toDouble(),
                    "time" to a.at.toDouble(),
                )
            }
        }

        /** before より前の通知の記録を消す（消すと、その公園・ルールの再通知の間隔もリセットされる）。消した件数を返す */
        AsyncFunction("clearRuleAlerts") { before: Double ->
            Store.get(context).deleteRuleAlertsBefore(before.toLong())
        }
    }
}
