package expo.modules.parktracker

import android.content.Context
import org.json.JSONObject

/**
* 通知の文言。JS（locales フォルダの各言語ファイルの `native`）から start() のときに渡され、SharedPreferences に保存する。
 * 外出の設定（Config）とは別に保存するので、外出を終えた後やアプリが動いていないとき（OS による再起動）も同じ言語で出せる。
 * 渡されていないキーは DEFAULTS（日本語）を使う。
 * 文言の `{park}` `{label}` は get() の values で置き換える。
 */
object UiTexts {
    private const val PREFS = "park_tracker"
    private const val KEY = "ui_texts"

    // locales/ja.ts の native と同じ内容にしておく
    private val DEFAULTS: Map<String, String> = mapOf(
        "park" to "公園",
        "channelTracking" to "位置情報の記録",
        "channelEnter" to "公園に入ったとき",
        "channelWatch" to "カメラでの見守り",
        "channelAlert" to "ルールに関係するものが映ったとき",
        "trackingTitle" to "近くの公園をチェック中",
        "trackingText" to "公園に入ると通知します",
        "outingEndedTitle" to "おかえりなさい",
        "outingEndedText" to "出発した場所の近くに戻ったので、外出を終えました",
        "enteredTitle" to "{park}に入りました",
        "enteredMore" to "タップしてほかのルールも確認",
        "enteredNoRule" to "タップしてルールを確認",
        "watchingTitle" to "{park}でルールを見守っています",
        "watchingText" to "画像は端末内で処理され、保存・送信されません",
        "watchIdleTitle" to "外出中",
        "watchIdleText" to "ルールが登録された公園に入ると、カメラでルールを見守ります",
        "watchStop" to "停止",
        "endOuting" to "外出を終える",
        "alertTitle" to "{park}のルールに注意",
        "alertSeen" to "「{label}」が映りました",
        "alertSeenTap" to "「{label}」が映りました・タップで詳細",
    )

    private val PLACEHOLDER = Regex("\\{(\\w+)\\}")

    @Volatile private var cache: Map<String, String>? = null

    /** JS から渡された文言を保存する。空なら何もしない（前回の文言のまま） */
    fun save(ctx: Context, texts: Map<String, String>) {
        if (texts.isEmpty()) return
        val clean = texts.filter { (k, v) -> k.isNotEmpty() && v.isNotEmpty() }
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY, JSONObject(clean).toString())
            .apply()
        cache = clean
    }

    private fun load(ctx: Context): Map<String, String> {
        cache?.let { return it }
        val json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        val map = HashMap<String, String>()
        if (json != null) {
            try {
                val o = JSONObject(json)
                val keys = o.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    val v = o.optString(k, "")
                    if (v.isNotEmpty()) map[k] = v
                }
            } catch (_: Exception) {
                // 壊れていたら既定の文言を使う
            }
        }
        cache = map
        return map
    }

    /** 文言を取り出し、`{name}` を values で置き換える（値の中の `{...}` はもう一度置き換えない） */
    fun get(ctx: Context, key: String, vararg values: Pair<String, String>): String {
        val template = load(ctx)[key] ?: DEFAULTS[key] ?: key
        if (values.isEmpty()) return template
        val map = values.toMap()
        return PLACEHOLDER.replace(template) { m -> map[m.groupValues[1]] ?: m.value }
    }

    /** 通知に出す公園名（名前が無ければ「公園」など） */
    fun parkName(ctx: Context, name: String): String = name.ifEmpty { get(ctx, "park") }
}
