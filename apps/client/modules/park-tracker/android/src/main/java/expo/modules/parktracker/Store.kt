package expo.modules.parktracker

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.location.Location

/**
 * 端末ローカルの保存先（SQLite）。
 *  - parks_cache : 1kmセルごとのサーバーレスポンス（同じセルでは再送しないためのキャッシュ）
 *  - notified    : 公園ID × 日付。その日に通知済みかどうか（内部用。7日で自動削除）
 *  - visits      : その日に初めて入った公園の履歴（JS から読む／消す）
 *  - fixes       : 公園内にいる間に取った位置（JS から読む／消す）
 *
 * サービスと RN モジュールの両方から使うので、プロセス内で1インスタンスにする。
 * SQLiteDatabase はスレッドセーフなので、複数スレッドから呼んでよい。
 */
class Store private constructor(ctx: Context) :
    SQLiteOpenHelper(ctx.applicationContext, "park_tracker.db", null, DB_VERSION) {

    companion object {
        private const val DB_VERSION = 2

        @Volatile private var instance: Store? = null
        fun get(ctx: Context): Store =
            instance ?: synchronized(this) { instance ?: Store(ctx).also { instance = it } }
    }

    data class CachedParks(val body: String, val fetchedAt: Long)
    data class Fix(val time: Long, val lat: Double, val lng: Double, val accuracy: Float, val parkIds: String)
    data class Visit(val parkId: String, val name: String, val day: String, val enteredAt: Long)

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE parks_cache (cell TEXT PRIMARY KEY, body TEXT NOT NULL, fetched_at INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE notified (park_id TEXT NOT NULL, day TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (park_id, day))")
        db.execSQL("CREATE TABLE visits (id INTEGER PRIMARY KEY AUTOINCREMENT, park_id TEXT NOT NULL, name TEXT NOT NULL, day TEXT NOT NULL, entered_at INTEGER NOT NULL)")
        db.execSQL("CREATE INDEX visits_entered_at ON visits (entered_at)")
        db.execSQL("CREATE TABLE fixes (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, acc REAL NOT NULL, park_ids TEXT NOT NULL)")
        db.execSQL("CREATE INDEX fixes_t ON fixes (t)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // v1 は開発中の版なので作り直す。リリース後にスキーマを変えるときは、ここでデータを移行すること
        recreate(db)
    }

    override fun onDowngrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        recreate(db)
    }

    private fun recreate(db: SQLiteDatabase) {
        for (t in listOf("parks_cache", "notified", "visits", "fixes")) db.execSQL("DROP TABLE IF EXISTS $t")
        onCreate(db)
    }

    // ---- ジオメトリのキャッシュ ----

    fun getParks(cell: String): CachedParks? =
        readableDatabase.rawQuery("SELECT body, fetched_at FROM parks_cache WHERE cell = ?", arrayOf(cell)).use { c ->
            if (c.moveToFirst()) CachedParks(c.getString(0), c.getLong(1)) else null
        }

    fun putParks(cell: String, body: String, fetchedAt: Long) {
        val v = ContentValues().apply {
            put("cell", cell)
            put("body", body)
            put("fetched_at", fetchedAt)
        }
        writableDatabase.insertWithOnConflict("parks_cache", null, v, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // ---- 入園（1日1回の通知と履歴） ----

    /**
     * その日まだ入っていない公園なら、通知済みとして記録し、履歴にも追加して true を返す。
     * すでにその日に記録があれば何もせず false。
     * 2つの書き込みを1つのトランザクションで行う（途中で落ちても片方だけ残らない）。
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
            db.setTransactionSuccessful()
            return first
        } finally {
            db.endTransaction()
        }
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

    // ---- 掃除（内部用のデータだけ） ----

    fun prune(now: Long) {
        val weekAgo = now - 7L * 24 * 60 * 60 * 1000
        writableDatabase.delete("parks_cache", "fetched_at < ?", arrayOf(weekAgo.toString()))
        writableDatabase.delete("notified", "at < ?", arrayOf(weekAgo.toString()))
    }
}
