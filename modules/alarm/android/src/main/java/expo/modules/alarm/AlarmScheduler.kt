package expo.modules.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri

object AlarmScheduler {
  private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

  private fun fireIntent(context: Context, id: String): PendingIntent {
    // The data makes each alarm's intent distinct, so one alarm never replaces another.
    val intent = Intent(context, AlarmReceiver::class.java)
      .setData(Uri.parse("myapp-alarm://$id"))
      .putExtra(AlarmReceiver.EXTRA_ID, id)
    return PendingIntent.getBroadcast(context, 0, intent, FLAGS)
  }

  private fun showIntent(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, 0, launch, FLAGS)
  }

  fun cancel(context: Context, id: String) {
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    manager.cancel(fireIntent(context, id))
  }

  /** setAlarmClock rings at the exact time, also in deep sleep, and Android shows the alarm icon. */
  private fun arm(context: Context, alarm: AlarmSpec, now: Long) {
    cancel(context, alarm.id)
    val trigger = alarm.nextTrigger(now) ?: return
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    manager.setAlarmClock(AlarmManager.AlarmClockInfo(trigger, showIntent(context)), fireIntent(context, alarm.id))
  }

  fun armAll(context: Context) {
    val now = System.currentTimeMillis()
    AlarmStore(context).load().forEach { arm(context, it, now) }
  }
}
