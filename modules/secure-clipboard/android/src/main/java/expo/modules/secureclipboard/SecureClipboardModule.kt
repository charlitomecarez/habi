package expo.modules.secureclipboard

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PersistableBundle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Android freezes a background app, so a timer cannot clear the clipboard. An alarm wakes this. */
class ClipboardClearReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    // A background app cannot read the clipboard, so this clears it without looking.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      clipboard.clearPrimaryClip()
    } else {
      clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
    }
  }
}

class SecureClipboardModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("SecureClipboard")

    /** Copies text marked as sensitive, and clears the clipboard after `clearAfterMs`. */
    Function("copy") { text: String, clearAfterMs: Double ->
      val clip = ClipData.newPlainText("Password", text)
      // The sensitive mark asks keyboards and previews not to keep or show the text.
      clip.description.extras = PersistableBundle().apply {
        putBoolean(EXTRA_IS_SENSITIVE, true)
      }
      val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      clipboard.setPrimaryClip(clip)

      val intent = Intent(context, ClipboardClearReceiver::class.java)
      val pending = PendingIntent.getBroadcast(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarms.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        System.currentTimeMillis() + clearAfterMs.toLong(),
        pending,
      )
    }
  }

  private companion object {
    const val EXTRA_IS_SENSITIVE = "android.content.extra.IS_SENSITIVE"
  }
}
