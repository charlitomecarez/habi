package expo.modules.alarm

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * One alarm. Weekdays run 1 (Monday) to 7 (Sunday), and an empty list rings once.
 * `atMs` marks a one-time alarm at a fixed moment, such as the test ring.
 */
data class AlarmSpec(
  val id: String,
  val hour: Int,
  val minute: Int,
  val days: List<Int>,
  val label: String,
  val enabled: Boolean,
  val atMs: Long?,
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
    .put("hour", hour)
    .put("minute", minute)
    .put("days", JSONArray(days))
    .put("label", label)
    .put("enabled", enabled)
    .put("atMs", atMs ?: JSONObject.NULL)

  /** The next ring after `now`, or null when it will not ring. */
  fun nextTrigger(now: Long): Long? {
    if (!enabled) return null
    if (atMs != null) return if (atMs > now) atMs else null

    val day = Calendar.getInstance().apply {
      timeInMillis = now
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    for (offset in 0..7) {
      if (day.timeInMillis > now && (days.isEmpty() || mondayFirst(day) in days)) return day.timeInMillis
      day.add(Calendar.DAY_OF_YEAR, 1)
    }
    return null
  }

  private fun mondayFirst(day: Calendar): Int = (day.get(Calendar.DAY_OF_WEEK) + 5) % 7 + 1

  companion object {
    fun fromJson(json: JSONObject): AlarmSpec {
      val days = json.optJSONArray("days") ?: JSONArray()
      return AlarmSpec(
        id = json.getString("id"),
        hour = json.optInt("hour"),
        minute = json.optInt("minute"),
        days = List(days.length()) { days.getInt(it) },
        label = json.optString("label"),
        enabled = json.optBoolean("enabled", true),
        atMs = if (json.isNull("atMs")) null else json.getLong("atMs"),
      )
    }
  }
}

/** Alarms live on the device, so they ring with no internet and no session. */
class AlarmStore(context: Context) {
  private val prefs = context.getSharedPreferences("my_app_alarms", Context.MODE_PRIVATE)

  fun load(): List<AlarmSpec> {
    val text = prefs.getString(KEY_ALARMS, null) ?: return emptyList()
    val array = JSONArray(text)
    return List(array.length()) { AlarmSpec.fromJson(array.getJSONObject(it)) }
  }

  fun save(alarms: List<AlarmSpec>) {
    val array = JSONArray()
    alarms.forEach { array.put(it.toJson()) }
    prefs.edit().putString(KEY_ALARMS, array.toString()).apply()
  }

  var ringingId: String?
    get() = prefs.getString(KEY_RINGING, null)
    set(value) {
      // commit, not apply: the service reads this straight after a restart.
      prefs.edit().putString(KEY_RINGING, value).commit()
    }

  private companion object {
    const val KEY_ALARMS = "alarms"
    const val KEY_RINGING = "ringing"
  }
}
