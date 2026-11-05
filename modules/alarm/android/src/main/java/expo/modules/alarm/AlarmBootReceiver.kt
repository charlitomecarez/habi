package expo.modules.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Android forgets alarms on a restart, an app update or a time change, so they are set again here. */
class AlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmScheduler.armAll(context)
  }
}
