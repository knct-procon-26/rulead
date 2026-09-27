package expo.modules.parktracker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.util.Log
import kotlin.math.sqrt

/**
 * 通知の大きいアイコン用に、ルールのピクトグラム（アプリの RuleIcon と同じ見た目）をビットマップに描く。
 *  - prohibition: 白地に黒い絵 + 赤い丸と斜線
 *  - caution:     黄色い三角（黒い縁）+ 黒い絵
 *  - information: 青い角丸四角 + 白い絵
 * 絵は MaterialDesignIcons のフォント（@react-native-vector-icons/material-design-icons が
 * APK の assets/fonts/ に入れるもの）のコードポイントで描く。
 * フォントやコードポイントが無い・描けないときは null（通知はアイコン無しで出す）。
 */
object RuleIconBitmap {
    private const val TAG = "RuleIconBitmap"
    private const val FONT_ASSET = "fonts/MaterialDesignIcons.ttf"

    private const val COLOR_TEXT = 0xFF111111.toInt()
    private const val COLOR_PROHIBITION = 0xFFE60012.toInt()
    private const val COLOR_CAUTION = 0xFFFFD400.toInt()
    private const val COLOR_INFORMATION = 0xFF0068B7.toInt()

    @Volatile private var typeface: Typeface? = null
    @Volatile private var fontFailed = false

    private fun font(context: Context): Typeface? {
        typeface?.let { return it }
        if (fontFailed) return null
        synchronized(this) {
            typeface?.let { return it }
            if (fontFailed) return null
            return try {
                Typeface.createFromAsset(context.assets, FONT_ASSET).also { typeface = it }
            } catch (e: Exception) {
                Log.w(TAG, "icon font not found: $FONT_ASSET", e)
                fontFailed = true
                null
            }
        }
    }

    private fun largeIconSize(context: Context): Int {
        val size = try {
            context.resources.getDimensionPixelSize(android.R.dimen.notification_large_icon_width)
        } catch (_: Exception) {
            0
        }
        return if (size > 0) size else 128
    }

    /** ルールのピクトグラム。描けなければ null */
    fun forRule(context: Context, rule: WatchRule): Bitmap? =
        create(context, rule.iconType, rule.iconCode)

    fun create(context: Context, iconType: String, iconCode: Int): Bitmap? {
        if (iconCode <= 0 || !Character.isValidCodePoint(iconCode)) return null
        val tf = font(context) ?: return null
        return try {
            draw(largeIconSize(context), tf, iconType, String(Character.toChars(iconCode)))
        } catch (e: Exception) {
            Log.w(TAG, "draw failed", e)
            null
        }
    }

    private fun draw(size: Int, tf: Typeface, iconType: String, glyph: String): Bitmap? {
        val s = size.toFloat()
        val glyphPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = tf
            textAlign = Paint.Align.LEFT
        }
        // フォントにその絵が無ければ、豆腐（□）を描かないようにやめる
        if (!glyphPaint.hasGlyph(glyph)) return null

        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
        val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }

        when (iconType) {
            "prohibition" -> {
                val ring = maxOf(3f, s * 0.09f)
                val r = (s - ring) / 2f
                fill.color = Color.WHITE
                canvas.drawCircle(s / 2f, s / 2f, s / 2f, fill)
                drawGlyph(canvas, glyphPaint, glyph, s * 0.56f, COLOR_TEXT, s / 2f, s / 2f)
                stroke.color = COLOR_PROHIBITION
                stroke.strokeWidth = ring
                canvas.drawCircle(s / 2f, s / 2f, r, stroke)
                // 左上から右下への斜線（円の内側いっぱい）
                val d = r / sqrt(2f)
                stroke.strokeCap = Paint.Cap.BUTT
                canvas.drawLine(s / 2f - d, s / 2f - d, s / 2f + d, s / 2f + d, stroke)
            }
            "caution" -> {
                val edge = maxOf(2f, s * 0.05f)
                val top = s * 0.08f
                val bottom = s * 0.92f
                val left = s * 0.04f
                val right = s * 0.96f
                val path = Path().apply {
                    moveTo(s / 2f, top)
                    lineTo(right, bottom)
                    lineTo(left, bottom)
                    close()
                }
                fill.color = COLOR_CAUTION
                canvas.drawPath(path, fill)
                stroke.color = COLOR_TEXT
                stroke.strokeWidth = edge
                stroke.strokeJoin = Paint.Join.ROUND
                canvas.drawPath(path, stroke)
                // 三角の重心より少し下に置く（アプリの RuleIcon と同じく下寄せ）
                drawGlyph(canvas, glyphPaint, glyph, s * 0.36f, COLOR_TEXT, s / 2f, s * 0.62f)
            }
            else -> {
                fill.color = COLOR_INFORMATION
                val radius = s * 0.16f
                canvas.drawRoundRect(RectF(0f, 0f, s, s), radius, radius, fill)
                drawGlyph(canvas, glyphPaint, glyph, s * 0.64f, Color.WHITE, s / 2f, s / 2f)
            }
        }
        return bmp
    }

    /** 絵の見た目の中心が (cx, cy) にくるように描く */
    private fun drawGlyph(canvas: Canvas, paint: Paint, glyph: String, textSize: Float, color: Int, cx: Float, cy: Float) {
        paint.textSize = textSize
        paint.color = color
        val bounds = Rect()
        paint.getTextBounds(glyph, 0, glyph.length, bounds)
        canvas.drawText(glyph, cx - bounds.exactCenterX(), cy - bounds.exactCenterY(), paint)
    }
}
