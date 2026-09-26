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

        Events(EVENT_LOCATION, EVENT_ENTER, EVENT_EXIT, EVENT_ERROR)

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
            val intent = Intent(ctx, ParkTrackerService::class.java)
                .putExtra(ParkTrackerService.EXTRA_CONFIG, Config(options.apiUrl, options.headers).toJson())
            try {
                ContextCompat.startForegroundService(ctx, intent)
            } catch (e: Exception) {
                // Android 12+ でバックグラウンドから呼ぶと ForegroundServiceStartNotAllowedException
                throw CodedException("E_START", e.message ?: e.toString(), e)
            }
        }

        AsyncFunction("stop") {
            val ctx = context
            Config.clear(ctx) // OS による自動再起動もさせない
            ctx.stopService(Intent(ctx, ParkTrackerService::class.java))
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
    }
}
