package expo.modules.screentime

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Screen time from Android's UsageStatsManager. Everything stays on the phone: the module only
 * returns totals to JavaScript, and my-app never sends them anywhere.
 */
class ScreenTimeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("ScreenTime")

    /** True when "Usage access" is on for my-app. */
    Function("hasAccess") {
      val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
      mode == AppOpsManager.MODE_ALLOWED
    }

    /** Opens the Usage access page in Settings. */
    Function("openSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /**
     * Foreground time per app between startMs and endMs, from the resume and pause events.
     * The home screen and my-app's own Settings trips are left out. Sorted longest first.
     */
    AsyncFunction("getUsage") { startMs: Double, endMs: Double ->
      val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val start = startMs.toLong()
      val end = endMs.toLong()
      val events = usm.queryEvents(start, end)
      val event = UsageEvents.Event()
      val openedAt = HashMap<String, Long>()
      val total = HashMap<String, Long>()

      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        val pkg = event.packageName ?: continue
        when (event.eventType) {
          UsageEvents.Event.ACTIVITY_RESUMED -> openedAt[pkg] = event.timeStamp
          UsageEvents.Event.ACTIVITY_PAUSED, UsageEvents.Event.ACTIVITY_STOPPED -> {
            val opened = openedAt.remove(pkg) ?: continue
            total[pkg] = (total[pkg] ?: 0L) + (event.timeStamp - opened)
          }
        }
      }
      // An app still open at the end of the range counts up to the end (or now).
      val until = minOf(end, System.currentTimeMillis())
      for ((pkg, opened) in openedAt) {
        if (until > opened) total[pkg] = (total[pkg] ?: 0L) + (until - opened)
      }

      val home = context.packageManager
        .resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_DEFAULT_ONLY)
        ?.activityInfo?.packageName
      val pm = context.packageManager

      total
        .filter { (pkg, ms) -> ms >= 1000 && pkg != home && pkg != "com.android.settings" }
        .map { (pkg, ms) ->
          val label = try {
            pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
          } catch (e: PackageManager.NameNotFoundException) {
            pkg
          }
          mapOf("packageName" to pkg, "label" to label, "totalMs" to ms.toDouble())
        }
        .sortedByDescending { it["totalMs"] as Double }
    }
  }
}
