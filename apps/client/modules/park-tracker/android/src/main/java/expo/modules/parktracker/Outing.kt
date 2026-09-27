package expo.modules.parktracker

import android.content.Context
import org.json.JSONObject

/**
 * 外出モードの状態（端末内の SharedPreferences にだけ保存する。出発地点はサーバーに送らない）。
 *
 *  - startedAt : 「外出する」を押した時刻（UNIX ミリ秒）
 *  - homeLat/Lng : 出発地点。押した後に最初に取れた精度のよい位置（まだ取れていなければ null）
 *  - leftHome : 出発地点から十分離れたことがあるか（離れる前に「帰ってきた」と判定しないため）
 *
 * ParkTrackerService の worker スレッドが更新し、OS に再起動されても続きから判定できるよう毎回保存する。
 */
object Outing {
    private const val PREFS = "park_tracker"
    private const val KEY = "outing"

    data class State(
        val startedAt: Long,
        val homeLat: Double? = null,
        val homeLng: Double? = null,
        val leftHome: Boolean = false,
    ) {
        val hasHome: Boolean get() = homeLat != null && homeLng != null

        fun toJson(): String = JSONObject().apply {
            put("startedAt", startedAt)
            if (homeLat != null && homeLng != null) {
                put("homeLat", homeLat)
                put("homeLng", homeLng)
            }
            put("leftHome", leftHome)
        }.toString()
    }

    private fun fromJson(json: String): State? = try {
        val o = JSONObject(json)
        val hasHome = o.has("homeLat") && o.has("homeLng")
        State(
            startedAt = o.getLong("startedAt"),
            homeLat = if (hasHome) o.getDouble("homeLat") else null,
            homeLng = if (hasHome) o.getDouble("homeLng") else null,
            leftHome = o.optBoolean("leftHome", false),
        )
    } catch (e: Exception) {
        null
    }

    /** 新しい外出を始める（前の外出の状態は捨てる） */
    fun begin(ctx: Context, now: Long) = save(ctx, State(startedAt = now))

    fun save(ctx: Context, s: State) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, s.toJson()).apply()
    }

    fun load(ctx: Context): State? =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)?.let { fromJson(it) }

    fun clear(ctx: Context) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
    }
}
