package expo.modules.alarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

/** The bridge from JavaScript. The alarm itself never needs JavaScript to ring. */
class AlarmModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("Alarm")

    /** Every alarm, as JSON. */
    Function("getAlarms") {
      val array = JSONArray()
      AlarmStore(context).load().forEach { array.put(it.toJson()) }
      array.toString()
    }

    /** Replaces every alarm and sets them with Android. */
    Function("saveAlarms") { json: String ->
      val store = AlarmStore(context)
      val array = JSONArray(json)
      val next = List(array.length()) { AlarmSpec.fromJson(array.getJSONObject(it)) }
      val kept = next.map { it.id }.toSet()
      store.load().filter { it.id !in kept }.forEach { AlarmScheduler.cancel(context, it.id) }
      store.save(next)
      AlarmScheduler.armAll(context)
    }

    /** The id of the alarm that is ringing, or null. */
    Function("getRingingId") {
      AlarmStore(context).ringingId
    }

    /** Stops the sound and the vibration, and takes the app off the lock screen. */
    Function("stopRinging") {
      AlarmStore(context).ringingId = null
      context.startService(Intent(context, AlarmService::class.java).setAction(AlarmService.ACTION_STOP))
      appContext.currentActivity?.let { AlarmLockScreen.show(it, false) }
    }

    /** The phone settings that can stop an alarm from showing or ringing. */
    Function("getSetup") {
      val notifications = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      mapOf(
        "notifications" to notifications.areNotificationsEnabled(),
        "fullScreen" to (Build.VERSION.SDK_INT < 34 || notifications.canUseFullScreenIntent()),
        "battery" to power.isIgnoringBatteryOptimizations(context.packageName),
      )
    }

    /** Opens the full-screen alarm page in Settings. */
    Function("openFullScreenSettings") {
      val action = if (Build.VERSION.SDK_INT >= 34) {
        Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT
      } else {
        Settings.ACTION_APPLICATION_DETAILS_SETTINGS
      }
      openSettings(action)
    }

    /** Opens the app's page, which holds Notifications and, on Samsung, Battery › Unrestricted. */
    Function("openAppSettings") {
      openSettings(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    }
  }

  private fun openSettings(action: String) {
    val intent = Intent(action, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }
}
