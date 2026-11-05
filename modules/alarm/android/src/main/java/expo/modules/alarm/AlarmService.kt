package expo.modules.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/** Plays the sound and the vibration until the stop task is done. Nothing else stops it. */
class AlarmService : Service() {
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // After a crash Android restarts the service with no intent, and the alarm must carry on.
    if (intent?.action == ACTION_STOP || AlarmStore(this).ringingId == null) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    goForeground()
    startRinging()
    return START_STICKY
  }

  private fun goForeground() {
    createChannel()
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(CHANNEL_ID, "Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
      // The service plays the sound itself, on the alarm volume.
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
  }

  private fun ringingScreen(): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(RINGING_LINK))
      .setPackage(packageName)
      .putExtra(EXTRA_RINGING, true)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun buildNotification(): Notification {
    val screen = ringingScreen()
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this).setPriority(Notification.PRIORITY_MAX)
    }
    return builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Alarm")
      .setContentText("Open my-app to stop it.")
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setContentIntent(screen)
      .setFullScreenIntent(screen, true)
      .build()
  }

  private fun startRinging() {
    if (player != null) return

    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "my-app:alarm").apply {
      setReferenceCounted(false)
      acquire()
    }

    val sound = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
    // A bad sound file must not silence the alarm, so the vibration starts either way.
    try {
      player = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build(),
        )
        setDataSource(this@AlarmService, sound)
        isLooping = true
        prepare()
        start()
      }
    } catch (error: Exception) {
      player?.release()
      player = null
    }
    startVibration()
  }

  private fun startVibration() {
    val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    vibrator = device
    val pattern = longArrayOf(0, 800, 400)
    when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> device.vibrate(
        VibrationEffect.createWaveform(pattern, 0),
        VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM),
      )
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O -> device.vibrate(VibrationEffect.createWaveform(pattern, 0))
      else -> {
        @Suppress("DEPRECATION")
        device.vibrate(pattern, 0)
      }
    }
  }

  override fun onDestroy() {
    player?.run {
      if (isPlaying) stop()
      release()
    }
    player = null
    vibrator?.cancel()
    vibrator = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    super.onDestroy()
  }

  companion object {
    const val ACTION_STOP = "expo.modules.alarm.STOP"
    const val EXTRA_RINGING = "alarmRinging"
    const val RINGING_LINK = "myapp://alarm-ringing"
    private const val CHANNEL_ID = "alarm-ringing"
    private const val NOTIFICATION_ID = 7301
  }
}
