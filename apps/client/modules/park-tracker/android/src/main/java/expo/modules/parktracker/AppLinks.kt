package expo.modules.parktracker

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * 通知をタップしたときに開く画面。
 * 公園 ID があれば `rulead:///?parkId=..&ruleId=..&at=..` のディープリンクでアプリを開く。
 * expo-router がこれを Rules タブ（"/"）の検索パラメータとして渡す。
 * （scheme は app.json の "scheme": "rulead"。変えたらここも変える）
 *
 * ディープリンクを受けられる Activity が無い（scheme 未設定など）ときは、従来どおりアプリを起動するだけにする。
 * 互換のため Intent extra "parkTrackerParkId" も付けておく。
 */
object AppLinks {
    private const val SCHEME = "rulead"
    const val EXTRA_PARK_ID = "parkTrackerParkId"

    fun rulesPendingIntent(ctx: Context, requestCode: Int, parkId: String?, ruleId: String? = null): PendingIntent? {
        val intent = rulesIntent(ctx, parkId, ruleId) ?: return null
        return PendingIntent.getActivity(
            ctx, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun rulesIntent(ctx: Context, parkId: String?, ruleId: String?): Intent? {
        if (parkId != null) {
            val query = StringBuilder("parkId=").append(Uri.encode(parkId))
            if (ruleId != null) query.append("&ruleId=").append(Uri.encode(ruleId))
            // 同じ公園の通知を何度タップしても「新しいリンク」として扱われるよう、作成時刻を付ける
            query.append("&at=").append(System.currentTimeMillis())
            val view = Intent(Intent.ACTION_VIEW, Uri.parse("$SCHEME:///?$query"))
                .setPackage(ctx.packageName)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_PARK_ID, parkId)
            if (view.resolveActivity(ctx.packageManager) != null) return view
        }
        val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return null
        launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        if (parkId != null) launch.putExtra(EXTRA_PARK_ID, parkId)
        return launch
    }
}
