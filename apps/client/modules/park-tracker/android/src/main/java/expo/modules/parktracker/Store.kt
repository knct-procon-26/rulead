package expo.modules.parktracker

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.location.Location
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 端末ローカルの保存先（SQLite）。
 *  - parks_cache : 1kmセルごとのサーバーレスポンス（同じセルでは再送しないためのキャッシュ）
 *  - park_details: 公園ごとの名前・住所・ルール（parks_cache と同じレスポンスから作る。Rules タブと見守りはここだけを読む。
 *                  どの公園にいるかをサーバーに知られないよう、公園ごとの問い合わせはしない）
 *  - notified    : 公園ID × 日付。その日に通知済みかどうか（内部用。7日で自動削除）
 *  - visits      : その日に初めて入った公園の履歴（JS から読む／消す）
 *  - fixes       : 公園内にいる間に取った位置（JS から読む／消す）
 *  - sightings   : カメラの見守り中に ML Kit で見つかったラベル。公園 × 日 × ラベルで1行（JS から読む／消す。日記用）
 *  - rule_alerts : ラベルがルールのキーワードに一致して通知した記録（JS から読む／消す。日記用）
 *  - visited_parks: 入ったことのある公園の名前・住所・ジオメトリ（日記の地図用。parks_cache と違い自動では消さない）
 *  画像そのものはどこにも保存しない。
 *
 * サービスと RN モジュールの両方から使うので、プロセス内で1インスタンスにする。
 * SQLiteDatabase はスレッドセーフなので、複数スレッドから呼んでよい。
 */
class Store private constructor(ctx: Context) :
    SQLiteOpenHelper(ctx.applicationContext, "park_tracker.db", null, DB_VERSION) {

    companion object {
        /**
         * v3: sightings / rule_alerts を追加（v2 のデータはそのまま残す）
         * v4: park_details を追加。ルール入りのレスポンスを取り直すため parks_cache だけ空にする
         * v5: visited_parks を追加。移行時、残っている parks_cache から訪問済みの公園のジオメトリを埋める
         */
        private const val DB_VERSION = 5

        @Volatile private var instance: Store? = null
        fun get(ctx: Context): Store =
            instance ?: synchronized(this) { instance ?: Store(ctx).also { instance = it } }

        /** 端末のタイムゾーンでの日付（"その日" の区切り）。visits.day と同じ形式 */
        fun dayOf(time: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(time))
    }

    data class CachedParks(val body: String, val fetchedAt: Long)
    data class ParkDetails(val parkId: String, val name: String, val address: String, val rulesJson: String, val fetchedAt: Long)
    data class Fix(val time: Long, val lat: Double, val lng: Double, val accuracy: Float, val parkIds: String)
    data class Visit(val parkId: String, val name: String, val day: String, val enteredAt: Long)
    data class VisitedPark(val parkId: String, val name: String, val address: String, val geometryJson: String, val updatedAt: Long)

    data class SeenLabel(val index: Int, val label: String, val confidence: Float)
    data class Sighting(
        val parkId: String,
        val parkName: String,
        val day: String,
        val labelIndex: Int,
        val label: String,
        val count: Int,
        val firstSeen: Long,
        val lastSeen: Long,
        val maxConfidence: Float,
    )
    data class RuleAlert(
        val parkId: String,
        val parkName: String,
        val ruleId: String,
        val ruleText: String,
        val labelIndex: Int,
        val label: String,
        val confidence: Float,
        val at: Long,
    )

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE parks_cache (cell TEXT PRIMARY KEY, body TEXT NOT NULL, fetched_at INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE notified (park_id TEXT NOT NULL, day TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (park_id, day))")
        db.execSQL("CREATE TABLE visits (id INTEGER PRIMARY KEY AUTOINCREMENT, park_id TEXT NOT NULL, name TEXT NOT NULL, day TEXT NOT NULL, entered_at INTEGER NOT NULL)")
        db.execSQL("CREATE INDEX visits_entered_at ON visits (entered_at)")
        db.execSQL("CREATE TABLE fixes (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, acc REAL NOT NULL, park_ids TEXT NOT NULL)")
        db.execSQL("CREATE INDEX fixes_t ON fixes (t)")
        createWatchTables(db)
        createDetailsTable(db)
        createVisitedParksTable(db)
    }

    /** v5 で追加したテーブル */
    private fun createVisitedParksTable(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS visited_parks (park_id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, " +
                "geometry TEXT NOT NULL, updated_at INTEGER NOT NULL)",
        )
    }

    /**
     * v4 → v5 の移行用：まだ残っている parks_cache のレスポンスから、visits にある公園のジオメトリを visited_parks に入れる。
     * 壊れたレスポンスは飛ばす（移行自体は失敗させない）。
     */
    private fun backfillVisitedParks(db: SQLiteDatabase) {
        val visited = HashSet<String>()
        db.rawQuery("SELECT DISTINCT park_id FROM visits", null).use { c ->
            while (c.moveToNext()) visited += c.getString(0)
        }
        if (visited.isEmpty()) return
        val rows = ArrayList<Pair<String, Long>>()
        db.rawQuery("SELECT body, fetched_at FROM parks_cache ORDER BY fetched_at", null).use { c ->
            while (c.moveToNext()) rows += c.getString(0) to c.getLong(1)
        }
        // 古い順に入れて新しいもので上書きする
        for ((body, fetchedAt) in rows) {
            val parks = try { GeoJson.parseParks(body) } catch (e: Exception) { continue }
            for (p in parks) {
                if (p.id in visited) putVisitedPark(db, p, fetchedAt)
            }
        }
    }

    private fun putVisitedPark(db: SQLiteDatabase, park: Park, updatedAt: Long) {
        if (park.geometryJson.isEmpty()) return
        val v = ContentValues().apply {
            put("park_id", park.id)
            put("name", park.name)
            put("address", park.address)
            put("geometry", park.geometryJson)
            put("updated_at", updatedAt)
        }
        db.insertWithOnConflict("visited_parks", null, v, SQLiteDatabase.CONFLICT_REPLACE)
    }

    /** v4 で追加したテーブル */
    private fun createDetailsTable(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS park_details (park_id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, " +
                "rules TEXT NOT NULL, fetched_at INTEGER NOT NULL)",
        )
    }

    /** v3 で追加したテーブル。onCreate と v2→v3 の移行の両方で使うので IF NOT EXISTS にしておく */
    private fun createWatchTables(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS sightings (id INTEGER PRIMARY KEY AUTOINCREMENT, park_id TEXT NOT NULL, park_name TEXT NOT NULL, " +
                "day TEXT NOT NULL, label_index INTEGER NOT NULL, label TEXT NOT NULL, count INTEGER NOT NULL, " +
                "first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, max_confidence REAL NOT NULL)",
        )
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS sightings_key ON sightings (park_id, day, label_index)")
        db.execSQL("CREATE INDEX IF NOT EXISTS sightings_last_seen ON sightings (last_seen)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS rule_alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, park_id TEXT NOT NULL, park_name TEXT NOT NULL, " +
                "rule_id TEXT NOT NULL, rule_text TEXT NOT NULL, label_index INTEGER NOT NULL, label TEXT NOT NULL, " +
                "confidence REAL NOT NULL, at INTEGER NOT NULL)",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS rule_alerts_at ON rule_alerts (at)")
        db.execSQL("CREATE INDEX IF NOT EXISTS rule_alerts_park_rule ON rule_alerts (park_id, rule_id, at)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // v1 は開発中の版なので作り直す
        if (oldVersion < 2) {
            recreate(db)
            return
        }
        // v2 → v3: テーブルを足すだけ（visits / fixes などの記録は消さない）
        if (oldVersion < 3) createWatchTables(db)
        // v3 → v4: 公園の詳細を保存するテーブルを足し、ルールの入っていない古いキャッシュを捨てて取り直させる
        if (oldVersion < 4) {
            createDetailsTable(db)
            db.delete("parks_cache", null, null)
        }
        // v4 → v5: 日記の地図用に、訪れた公園のジオメトリを残すテーブルを足す
        if (oldVersion < 5) {
            createVisitedParksTable(db)
            backfillVisitedParks(db)
        }
        // これ以降にスキーマを変えるときは、ここに if (oldVersion < 5) ... のように移行を足すこと
    }

    override fun onDowngrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        recreate(db)
    }

    private fun recreate(db: SQLiteDatabase) {
        for (t in listOf("parks_cache", "notified", "visits", "fixes", "sightings", "rule_alerts", "park_details", "visited_parks")) {
            db.execSQL("DROP TABLE IF EXISTS $t")
        }
        onCreate(db)
    }

    // ---- ジオメトリのキャッシュ ----

    fun getParks(cell: String): CachedParks? =
        readableDatabase.rawQuery("SELECT body, fetched_at FROM parks_cache WHERE cell = ?", arrayOf(cell)).use { c ->
            if (c.moveToFirst()) CachedParks(c.getString(0), c.getLong(1)) else null
        }

    /**
     * セルのレスポンスと、そこに含まれる公園の詳細をまとめて保存する（1つのトランザクション）。
     * 同じ公園が複数のセルに含まれる場合は、最後に取得したもので上書きする。
     */
    fun putParks(cell: String, body: String, parks: List<Park>, fetchedAt: Long) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val v = ContentValues().apply {
                put("cell", cell)
                put("body", body)
                put("fetched_at", fetchedAt)
            }
            db.insertWithOnConflict("parks_cache", null, v, SQLiteDatabase.CONFLICT_REPLACE)
            for (p in parks) {
                val d = ContentValues().apply {
                    put("park_id", p.id)
                    put("name", p.name)
                    put("address", p.address)
                    put("rules", p.rulesJson)
                    put("fetched_at", fetchedAt)
                }
                db.insertWithOnConflict("park_details", null, d, SQLiteDatabase.CONFLICT_REPLACE)
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    /** 次に位置を処理したとき、どのセルもサーバーから取り直させる（公園の詳細は取り直すまで今のものを使う） */
    fun clearParksCache(): Int = writableDatabase.delete("parks_cache", null, null)

    fun getParkDetails(parkId: String): ParkDetails? =
        readableDatabase.rawQuery(
            "SELECT park_id, name, address, rules, fetched_at FROM park_details WHERE park_id = ?",
            arrayOf(parkId),
        ).use { c ->
            if (c.moveToFirst()) ParkDetails(c.getString(0), c.getString(1), c.getString(2), c.getString(3), c.getLong(4)) else null
        }

    // ---- 入園（1日1回の通知と履歴） ----

    /**
     * その日まだ入っていない公園なら、通知済みとして記録し、履歴にも追加して true を返す。
     * すでにその日に記録があれば何もせず false。
     * 2つの書き込みを1つのトランザクションで行う（途中で落ちても片方だけ残らない）。
     * あわせて visited_parks（日記の地図用のジオメトリ）を毎回上書きする。
     */
    fun recordFirstVisitOfDay(park: Park, day: String, enteredAt: Long): Boolean {
        val db = writableDatabase
        db.beginTransaction()
        try {
            val n = ContentValues().apply {
                put("park_id", park.id)
                put("day", day)
                put("at", enteredAt)
            }
            val first = db.insertWithOnConflict("notified", null, n, SQLiteDatabase.CONFLICT_IGNORE) != -1L
            if (first) {
                val v = ContentValues().apply {
                    put("park_id", park.id)
                    put("name", park.name)
                    put("day", day)
                    put("entered_at", enteredAt)
                }
                db.insert("visits", null, v)
            }
            // 日記の地図用に、入るたびに最新のジオメトリで上書きしておく（その日2回目以降の入園でも更新する）
            putVisitedPark(db, park, enteredAt)
            db.setTransactionSuccessful()
            return first
        } finally {
            db.endTransaction()
        }
    }

    fun getVisitedPark(parkId: String): VisitedPark? =
        readableDatabase.rawQuery(
            "SELECT park_id, name, address, geometry, updated_at FROM visited_parks WHERE park_id = ?",
            arrayOf(parkId),
        ).use { c ->
            if (c.moveToFirst()) VisitedPark(c.getString(0), c.getString(1), c.getString(2), c.getString(3), c.getLong(4)) else null
        }

    fun queryVisits(from: Long, to: Long): List<Visit> =
        readableDatabase.rawQuery(
            "SELECT park_id, name, day, entered_at FROM visits WHERE entered_at >= ? AND entered_at < ? ORDER BY entered_at",
            arrayOf(from.toString(), to.toString()),
        ).use { c ->
            val out = ArrayList<Visit>(c.count)
            while (c.moveToNext()) out += Visit(c.getString(0), c.getString(1), c.getString(2), c.getLong(3))
            out
        }

    /** 履歴だけを消す。通知済みの記録（notified）は消さないので、今日の再通知は起きない。 */
    fun deleteVisitsBefore(time: Long): Int =
        writableDatabase.delete("visits", "entered_at < ?", arrayOf(time.toString()))

    // ---- 位置の記録 ----

    fun insertFix(loc: Location, parkIds: Collection<String>) {
        val v = ContentValues().apply {
            put("t", loc.time)
            put("lat", loc.latitude)
            put("lng", loc.longitude)
            put("acc", if (loc.hasAccuracy()) loc.accuracy else -1f)
            put("park_ids", parkIds.joinToString(","))
        }
        writableDatabase.insert("fixes", null, v)
    }

    fun queryFixes(from: Long, to: Long): List<Fix> =
        readableDatabase.rawQuery(
            "SELECT t, lat, lng, acc, park_ids FROM fixes WHERE t >= ? AND t < ? ORDER BY t",
            arrayOf(from.toString(), to.toString()),
        ).use { c ->
            val out = ArrayList<Fix>(c.count)
            while (c.moveToNext()) out += Fix(c.getLong(0), c.getDouble(1), c.getDouble(2), c.getFloat(3), c.getString(4))
            out
        }

    fun deleteFixesBefore(time: Long): Int =
        writableDatabase.delete("fixes", "t < ?", arrayOf(time.toString()))

    // ---- カメラで見つかったもの（日記用） ----

    /**
     * 1回の画像処理で見つかったラベルをまとめて記録する。
     * 公園 × 日 × ラベルごとに1行で、見つかるたびに count を増やし last_seen / max_confidence を更新する。
     * 古い Android の SQLite には UPSERT が無いので、UPDATE して 0 行なら INSERT する（トランザクション内）。
     */
    fun recordSightings(parkId: String, parkName: String, day: String, labels: List<SeenLabel>, at: Long) {
        if (labels.isEmpty()) return
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.compileStatement(
                "UPDATE sightings SET count = count + 1, last_seen = ?, max_confidence = MAX(max_confidence, ?), park_name = ?, label = ? " +
                    "WHERE park_id = ? AND day = ? AND label_index = ?",
            ).use { upd ->
                for (l in labels) {
                    upd.clearBindings()
                    upd.bindLong(1, at)
                    upd.bindDouble(2, l.confidence.toDouble())
                    upd.bindString(3, parkName)
                    upd.bindString(4, l.label)
                    upd.bindString(5, parkId)
                    upd.bindString(6, day)
                    upd.bindLong(7, l.index.toLong())
                    if (upd.executeUpdateDelete() == 0) {
                        val v = ContentValues().apply {
                            put("park_id", parkId)
                            put("park_name", parkName)
                            put("day", day)
                            put("label_index", l.index)
                            put("label", l.label)
                            put("count", 1)
                            put("first_seen", at)
                            put("last_seen", at)
                            put("max_confidence", l.confidence.toDouble())
                        }
                        db.insert("sightings", null, v)
                    }
                }
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    /** from 以上 to 未満の間に見えていたもの（first_seen〜last_seen がその範囲に重なる行）。最初に見た順 */
    fun querySightings(from: Long, to: Long): List<Sighting> =
        readableDatabase.rawQuery(
            "SELECT park_id, park_name, day, label_index, label, count, first_seen, last_seen, max_confidence FROM sightings " +
                "WHERE last_seen >= ? AND first_seen < ? ORDER BY first_seen, id",
            arrayOf(from.toString(), to.toString()),
        ).use { c ->
            val out = ArrayList<Sighting>(c.count)
            while (c.moveToNext()) {
                out += Sighting(
                    c.getString(0), c.getString(1), c.getString(2), c.getInt(3), c.getString(4),
                    c.getInt(5), c.getLong(6), c.getLong(7), c.getFloat(8),
                )
            }
            out
        }

    /** 最後に見たのが before より前の行を消す。消した件数を返す */
    fun deleteSightingsBefore(time: Long): Int =
        writableDatabase.delete("sightings", "last_seen < ?", arrayOf(time.toString()))

    fun insertRuleAlert(a: RuleAlert) {
        val v = ContentValues().apply {
            put("park_id", a.parkId)
            put("park_name", a.parkName)
            put("rule_id", a.ruleId)
            put("rule_text", a.ruleText)
            put("label_index", a.labelIndex)
            put("label", a.label)
            put("confidence", a.confidence.toDouble())
            put("at", a.at)
        }
        writableDatabase.insert("rule_alerts", null, v)
    }

    /** その公園のそのルールを最後に通知した時刻（なければ null） */
    fun lastRuleAlertAt(parkId: String, ruleId: String): Long? =
        readableDatabase.rawQuery(
            "SELECT MAX(at) FROM rule_alerts WHERE park_id = ? AND rule_id = ?",
            arrayOf(parkId, ruleId),
        ).use { c ->
            if (c.moveToFirst() && !c.isNull(0)) c.getLong(0) else null
        }

    fun queryRuleAlerts(from: Long, to: Long): List<RuleAlert> =
        readableDatabase.rawQuery(
            "SELECT park_id, park_name, rule_id, rule_text, label_index, label, confidence, at FROM rule_alerts " +
                "WHERE at >= ? AND at < ? ORDER BY at, id",
            arrayOf(from.toString(), to.toString()),
        ).use { c ->
            val out = ArrayList<RuleAlert>(c.count)
            while (c.moveToNext()) {
                out += RuleAlert(
                    c.getString(0), c.getString(1), c.getString(2), c.getString(3),
                    c.getInt(4), c.getString(5), c.getFloat(6), c.getLong(7),
                )
            }
            out
        }

    fun deleteRuleAlertsBefore(time: Long): Int =
        writableDatabase.delete("rule_alerts", "at < ?", arrayOf(time.toString()))

    // ---- 掃除（内部用のデータだけ。日記用の sightings / rule_alerts は JS が消すまで残す） ----

    fun prune(now: Long) {
        val weekAgo = now - 7L * 24 * 60 * 60 * 1000
        writableDatabase.delete("parks_cache", "fetched_at < ?", arrayOf(weekAgo.toString()))
        writableDatabase.delete("park_details", "fetched_at < ?", arrayOf(weekAgo.toString()))
        writableDatabase.delete("notified", "at < ?", arrayOf(weekAgo.toString()))
    }
}
