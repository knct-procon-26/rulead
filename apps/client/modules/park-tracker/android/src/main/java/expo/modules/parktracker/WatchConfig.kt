package expo.modules.parktracker

import org.json.JSONArray
import org.json.JSONObject

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

data class WatchRule(val id: String, val text: String, val keywords: List<WatchKeyword>) {
    fun matches(labelIndex: Int, labelText: String): Boolean = keywords.any { k ->
        (k.index >= 0 && k.index == labelIndex) ||
            (k.label.isNotEmpty() && k.label.equals(labelText, ignoreCase = true))
    }
}

data class WatchConfig(
    val parkId: String,
    val parkName: String,
    val rules: List<WatchRule>,
) {
    val displayName: String get() = parkName.ifEmpty { "公園" }

    fun toJson(): String = JSONObject().apply {
        put("parkId", parkId)
        put("parkName", parkName)
        put("rules", JSONArray().apply {
            for (r in rules) {
                put(JSONObject().apply {
                    put("id", r.id)
                    put("text", r.text)
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
                rules += WatchRule(id, str(r, "text"), keywords)
            }
            return rules
        }

        /** null / JSONObject.NULL / 文字列以外は "" として扱う（optString は null を "null" にしてしまうため） */
        private fun str(o: JSONObject, key: String): String {
            val v = o.opt(key)
            return if (v is String) v else ""
        }
    }
}
