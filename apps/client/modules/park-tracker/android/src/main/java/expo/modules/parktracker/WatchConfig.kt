package expo.modules.parktracker

import org.json.JSONArray
import org.json.JSONObject
import kotlin.random.Random

/**
 * カメラでの見守り（RuleWatchService）で照合する、1つの公園のルール。
 *
 * 通常は端末に保存してある公園の詳細（park_details.rules = サーバーの RuleResult[] の JSON）から forPark で作る。
 * 開発用に、JS から JSON（fromJson）で公園とルールを直接渡すこともできる。
 *
 * keywords[].index は ML Kit の base モデルのラベル index（サーバーの keywords.index / lib/label.ts の LABEL のキー）。
 * 照合は index で行い、念のためラベル名（英語）の一致でも拾う。
 */
data class WatchKeyword(val index: Int, val label: String)

/**
 * text: 英語の原文 / localText: サーバーが翻訳した文（外出開始時に選んでいた言語。無ければ ""）
 * iconName / iconType / iconCode: ピクトグラム（iconCode は MaterialDesignIcons のコードポイント。無ければ -1）
 */
data class WatchRule(
    val id: String,
    val text: String,
    val keywords: List<WatchKeyword>,
    val localText: String = "",
    val iconName: String = "",
    val iconType: String = "",
    val iconCode: Int = -1,
) {
    fun matches(labelIndex: Int, labelText: String): Boolean = keywords.any { k ->
        (k.index >= 0 && k.index == labelIndex) ||
            (k.label.isNotEmpty() && k.label.equals(labelText, ignoreCase = true))
    }

    /** 通知に出す文（翻訳があれば翻訳、無ければ英語の原文） */
    val displayText: String get() = localText.ifEmpty { text }
}

data class WatchConfig(
    val parkId: String,
    val parkName: String,
    val rules: List<WatchRule>,
) {
    fun toJson(): String = JSONObject().apply {
        put("parkId", parkId)
        put("parkName", parkName)
        put("rules", JSONArray().apply {
            for (r in rules) {
                put(JSONObject().apply {
                    put("id", r.id)
                    put("text", r.text)
                    put("textLocal", r.localText)
                    put("iconName", r.iconName)
                    put("iconType", r.iconType)
                    put("iconCode", r.iconCode)
                    put("keywords", JSONArray().apply {
                        for (k in r.keywords) {
                            put(JSONObject().apply {
                                put("index", k.index)
                                put("label", k.label)
                            })
                        }
                    })
                })
            }
        })
    }.toString()

    companion object {
        /** 開発用：JS から渡された { parkId, parkName, rules }。形が正しくなければ例外を投げる */
        fun fromJson(json: String): WatchConfig {
            val o = JSONObject(json)
            val parkId = str(o, "parkId")
            require(parkId.isNotEmpty()) { "parkId is required" }
            val rulesJson = o.optJSONArray("rules") ?: throw IllegalArgumentException("rules is required")
            return WatchConfig(parkId, str(o, "parkName"), parseRules(rulesJson))
        }

        /** 端末に保存してある公園の詳細から作る。rulesJson が壊れていれば例外を投げる */
        fun forPark(parkId: String, parkName: String, rulesJson: String): WatchConfig =
            WatchConfig(parkId, parkName, parseRules(JSONArray(rulesJson)))

        private fun parseRules(arr: JSONArray): List<WatchRule> {
            val rules = ArrayList<WatchRule>(arr.length())
            val seen = HashSet<String>()
            for (i in 0 until arr.length()) {
                val r = arr.optJSONObject(i) ?: continue
                val id = str(r, "id")
                if (id.isEmpty() || !seen.add(id)) continue
                val kwJson = r.optJSONArray("keywords")
                val keywords = ArrayList<WatchKeyword>()
                if (kwJson != null) {
                    for (j in 0 until kwJson.length()) {
                        val k = kwJson.optJSONObject(j) ?: continue
                        val index = k.optInt("index", -1)
                        val label = str(k, "label")
                        if (index >= 0 || label.isNotEmpty()) keywords += WatchKeyword(index, label)
                    }
                }
                rules += WatchRule(
                    id = id,
                    text = str(r, "text"),
                    keywords = keywords,
                    localText = str(r, "textLocal"),
                    iconName = str(r, "iconName"),
                    iconType = str(r, "iconType"),
                    iconCode = r.optInt("iconCode", -1),
                )
            }
            return rules
        }

        /** 端末に保存してある公園のルール（サーバーの JSON）を読む。壊れていれば空 */
        fun parseRulesOrEmpty(rulesJson: String): List<WatchRule> =
            try {
                parseRules(JSONArray(rulesJson))
            } catch (_: Exception) {
                emptyList()
            }

        /**
         * 公園に入ったときの通知に1件だけ載せるルール。
         * 禁止 → 注意 → 案内 の順に、いちばん優先度の高い種類の中からランダムに1件選ぶ。
         * 本文が空のものは選ばない。ルールが無ければ null。
         */
        fun pickFeatured(rules: List<WatchRule>, random: Random = Random.Default): WatchRule? {
            fun rank(r: WatchRule) = when (r.iconType) {
                "prohibition" -> 0
                "caution" -> 1
                else -> 2
            }
            val candidates = rules.filter { it.displayText.isNotBlank() }
            val best = candidates.minOfOrNull { rank(it) } ?: return null
            return candidates.filter { rank(it) == best }.random(random)
        }

        /** null / JSONObject.NULL / 文字列以外は "" として扱う（optString は null を "null" にしてしまうため） */
        private fun str(o: JSONObject, key: String): String {
            val v = o.opt(key)
            return if (v is String) v else ""
        }
    }
}
