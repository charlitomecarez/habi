package expo.modules.alarm

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import java.lang.ref.WeakReference

/** Shows the app over the lock screen only while an alarm rings. */
object AlarmLockScreen {
  fun show(activity: Activity, on: Boolean) {
    activity.runOnUiThread {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(on)
        activity.setTurnScreenOn(on)
      } else {
        @Suppress("DEPRECATION")
        val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        if (on) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
      }
    }
  }
}

internal class AlarmActivityListener : ReactActivityLifecycleListener {
  private var activity = WeakReference<Activity>(null)

  private fun isRinging(intent: Intent?) = intent?.getBooleanExtra(AlarmService.EXTRA_RINGING, false) == true

  override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
    this.activity = WeakReference(activity)
    if (isRinging(activity.intent)) AlarmLockScreen.show(activity, true)
  }

  override fun onNewIntent(intent: Intent?): Boolean {
    if (isRinging(intent)) activity.get()?.let { AlarmLockScreen.show(it, true) }
    return false
  }
}
