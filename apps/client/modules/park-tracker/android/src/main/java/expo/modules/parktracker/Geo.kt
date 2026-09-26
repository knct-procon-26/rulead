package expo.modules.parktracker

import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.cos
import kotlin.math.floor

/** 緯度1度あたりのメートル数（経度1度は これ × cos(緯度)） */
internal const val METERS_PER_DEG_LAT = 111_320.0

/**
 * 約1km四方のグリッド。【サーバーに送る位置を丸めるためだけに使う】
 * 公園の内外判定や端末への記録には、丸める前の生の位置を使う。
 */
object Grid {
    private const val STEP_LAT = 1000.0 / METERS_PER_DEG_LAT // 南北1km（度）

    data class Cell(val key: String, val centerLat: Double, val centerLng: Double)

    fun cellOf(lat: Double, lng: Double): Cell {
        val latIdx = floor(lat / STEP_LAT).toLong()
        val centerLat = (latIdx + 0.5) * STEP_LAT
        // 東西1kmは緯度で変わるので、セル中心の緯度で幅を決める（同じ行のセルは常に同じ幅）
        val stepLng = STEP_LAT / cos(Math.toRadians(centerLat))
        val lngIdx = floor(lng / stepLng).toLong()
        val centerLng = (lngIdx + 0.5) * stepLng
        return Cell("$latIdx:$lngIdx", centerLat, centerLng)
    }
}

/**
 * 公園1つ分のジオメトリ。
 * polygons[i] が1つのポリゴンで、polygons[i][0] が外周、polygons[i][1..] が穴。
 * 各リングは [lng0, lat0, lng1, lat1, ...] の平坦な配列（GeoJSON と同じ 経度, 緯度 の順）。
 */
class Park(
    val id: String,
    val name: String,
    private val polygons: List<List<DoubleArray>>,
) {
    val displayName: String get() = name.ifEmpty { "公園" }

    private var minLat = Double.POSITIVE_INFINITY
    private var maxLat = Double.NEGATIVE_INFINITY
    private var minLng = Double.POSITIVE_INFINITY
    private var maxLng = Double.NEGATIVE_INFINITY

    init {
        for (rings in polygons) {
            val outer = rings.firstOrNull() ?: continue
            var k = 0
            while (k + 1 < outer.size) {
                val lng = outer[k]
                val lat = outer[k + 1]
                if (lng < minLng) minLng = lng
                if (lng > maxLng) maxLng = lng
                if (lat < minLat) minLat = lat
                if (lat > maxLat) maxLat = lat
                k += 2
            }
        }
    }

    /** 入園判定用：サーバーのジオメトリそのままで内外を判定する */
    fun contains(lat: Double, lng: Double): Boolean {
        // まず外接矩形で素早く弾く
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return false
        return polygons.any { rings ->
            rings.isNotEmpty() &&
                inRing(rings[0], lng, lat) &&
                rings.drop(1).none { hole -> inRing(hole, lng, lat) }
        }
    }

    /**
     * 退園判定用：ジオメトリを bufferM メートル外側に広げた範囲に入っているか。
     * 「ポリゴンの中」または「ポリゴンの境界（外周・穴の縁）から bufferM 以内」なら true。
     */
    fun containsWithin(lat: Double, lng: Double, bufferM: Double): Boolean {
        if (bufferM <= 0.0) return contains(lat, lng)
        val kx = METERS_PER_DEG_LAT * cos(Math.toRadians(lat)) // 経度1度のメートル数（この地点）
        val ky = METERS_PER_DEG_LAT
        val dLat = bufferM / ky
        val dLng = bufferM / kx
        if (lat < minLat - dLat || lat > maxLat + dLat || lng < minLng - dLng || lng > maxLng + dLng) return false
        if (contains(lat, lng)) return true
        val limit2 = bufferM * bufferM
        for (rings in polygons) {
            for (ring in rings) {
                if (minDist2ToRing(ring, lat, lng, kx, ky) <= limit2) return true
            }
        }
        return false
    }

    /** レイキャスティング法による点の内外判定（x = 経度, y = 緯度） */
    private fun inRing(ring: DoubleArray, x: Double, y: Double): Boolean {
        val n = ring.size / 2
        if (n < 3) return false
        var inside = false
        var j = n - 1
        for (i in 0 until n) {
            val xi = ring[2 * i]
            val yi = ring[2 * i + 1]
            val xj = ring[2 * j]
            val yj = ring[2 * j + 1]
            if ((yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
                inside = !inside
            }
            j = i
        }
        return inside
    }

    /**
     * 点からリングの各辺までの最短距離の2乗（m²）。
     * 公園程度の大きさなら、点のまわりを平面とみなす近似（正距円筒）で誤差は無視できる。
     */
    private fun minDist2ToRing(ring: DoubleArray, lat: Double, lng: Double, kx: Double, ky: Double): Double {
        val n = ring.size / 2
        if (n == 0) return Double.POSITIVE_INFINITY
        var best = Double.POSITIVE_INFINITY
        var j = n - 1
        for (i in 0 until n) {
            // 点を原点とした平面座標（メートル）
            val ax = (ring[2 * j] - lng) * kx
            val ay = (ring[2 * j + 1] - lat) * ky
            val bx = (ring[2 * i] - lng) * kx
            val by = (ring[2 * i + 1] - lat) * ky
            val dx = bx - ax
            val dy = by - ay
            val len2 = dx * dx + dy * dy
            var t = if (len2 == 0.0) 0.0 else -(ax * dx + ay * dy) / len2
            if (t < 0.0) t = 0.0 else if (t > 1.0) t = 1.0
            val cx = ax + t * dx
            val cy = ay + t * dy
            val d2 = cx * cx + cy * cy
            if (d2 < best) best = d2
            j = i
        }
        return best
    }
}

/**
 * サーバーのレスポンス（GeoJSON FeatureCollection）を Park のリストに変換する。
 * 想定: features[].id または features[].properties.id が公園ID、properties.name が名前、
 *       geometry が Polygon か MultiPolygon。
 * レスポンス形式が違う場合はここだけ書き換える。
 */
object GeoJson {
    fun parseParks(json: String): List<Park> {
        val root = JSONObject(json)
        // エラー応答（{"error": ...} など）を「公園なし」として24時間キャッシュしないよう、形をはっきり確かめる
        require(root.optString("type") == "FeatureCollection") { "not a FeatureCollection" }
        val features = root.optJSONArray("features") ?: throw IllegalArgumentException("features is missing")
        val parks = ArrayList<Park>()
        for (i in 0 until features.length()) {
            val f = features.optJSONObject(i) ?: continue
            val geom = f.optJSONObject("geometry") ?: continue
            val props = f.optJSONObject("properties")
            val id = idOf(f) ?: props?.let { idOf(it) } ?: continue
            val name = props?.optString("name", "") ?: ""
            val coords = geom.optJSONArray("coordinates") ?: continue
            val polygons = when (geom.optString("type")) {
                "Polygon" -> listOf(parsePolygon(coords))
                "MultiPolygon" -> (0 until coords.length()).map { parsePolygon(coords.getJSONArray(it)) }
                else -> continue
            }
            parks += Park(id, name, polygons)
        }
        return parks
    }

    private fun idOf(o: JSONObject): String? {
        val v = o.opt("id")
        return if (v == null || v == JSONObject.NULL) null else v.toString()
    }

    private fun parsePolygon(rings: JSONArray): List<DoubleArray> =
        (0 until rings.length()).map { r ->
            val ring = rings.getJSONArray(r)
            DoubleArray(ring.length() * 2).also { out ->
                for (p in 0 until ring.length()) {
                    val pt = ring.getJSONArray(p)
                    out[p * 2] = pt.getDouble(0)     // 経度
                    out[p * 2 + 1] = pt.getDouble(1) // 緯度
                }
            }
        }
}
