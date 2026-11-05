package expo.modules.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/** The moment an alarm is due. The sound starts here, before any app screen loads. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    val store = AlarmStore(context)
    val alarms = store.load()
    val alarm = alarms.find { it.id == id } ?: return

    store.ringingId = id
    val service = Intent(context, AlarmService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(service) else context.startService(service)

    // A one-time alarm has now rung. A repeating alarm stays on, for its next day.
    val next = alarms.mapNotNull {
      when {
        it.id != id -> it
        it.atMs != null -> null
        it.days.isEmpty() -> it.copy(enabled = false)
        else -> it
      }
    }
    store.save(next)
    AlarmScheduler.armAll(context)
  }

  companion object {
    const val EXTRA_ID = "alarmId"
  }
}
