package expo.modules.parktracker

import android.net.Uri
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI

/**
 * API サーバーへの問い合わせ。
 * 送るのは生の現在地ではなく「1kmセルの中心座標」だけ。
 *
 * 想定: GET {apiUrl}?lat=..&lng=..  →  GeoJSON FeatureCollection
 * サーバーの仕様（POST / パラメータ名 / 認証）が違う場合はこの関数だけ書き換える。
 */
object ParkApi {
    fun fetch(cfg: Config, cell: Grid.Cell): String {
        val uri = Uri.parse(cfg.apiUrl).buildUpon()
            .appendQueryParameter("lat", cell.centerLat.toString())
            .appendQueryParameter("lng", cell.centerLng.toString())
            .build()
        val conn = URI.create(uri.toString()).toURL().openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000
        conn.readTimeout = 15_000
        conn.setRequestProperty("Accept", "application/json")
        cfg.headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
        try {
            val code = conn.responseCode
            if (code !in 200..299) throw IOException("HTTP $code")
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }
}
