package expo.modules.parktracker

import android.content.Context
import org.json.JSONObject

/**
 * JS から渡される設定。
 * OS にサービスを再起動されたとき（Intent が null で来る）にも使えるよう SharedPreferences に保存する。
 */
data class Config(
    val apiUrl: String,
    val headers: Map<String, String> = emptyMap(),
) {
    fun toJson(): String = JSONObject().apply {
        put("apiUrl", apiUrl)
        put("headers", JSONObject(headers))
    }.toString()

    companion object {
        private const val PREFS = "park_tracker"
        private const val KEY = "config"

        fun fromJson(json: String): Config? = try {
            val o = JSONObject(json)
            val h = o.optJSONObject("headers")
            val headers = HashMap<String, String>()
            if (h != null) {
                val keys = h.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    headers[k] = h.getString(k)
                }
            }
            Config(o.getString("apiUrl"), headers)
        } catch (e: Exception) {
            null
        }

        fun save(ctx: Context, c: Config) {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, c.toJson()).apply()
        }

        fun load(ctx: Context): Config? =
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)?.let { fromJson(it) }

        fun clear(ctx: Context) {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
        }
    }
}
