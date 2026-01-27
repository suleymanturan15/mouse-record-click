package com.suleymanturan15.mousescheduler.util

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

enum class DayCode(val label: String) {
  MON("Pzt"),
  TUE("Sal"),
  WED("Çar"),
  THU("Per"),
  FRI("Cum"),
  SAT("Cmt"),
  SUN("Paz")
}

private val TIME_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")

fun parseFlexibleTime(input: String): String? {
  val s = input.trim()
  if (s.isEmpty()) return null
  if (s.contains(":")) {
    return try {
      val t = LocalTime.parse(s, TIME_FMT)
      TIME_FMT.format(t)
    } catch (_: Exception) {
      null
    }
  }

  // "0830" -> "08:30"
  val digits = s.filter { it.isDigit() }
  if (digits.length == 3 || digits.length == 4) {
    val padded = digits.padStart(4, '0')
    val hh = padded.substring(0, 2).toIntOrNull() ?: return null
    val mm = padded.substring(2, 4).toIntOrNull() ?: return null
    if (hh !in 0..23 || mm !in 0..59) return null
    return "%02d:%02d".format(hh, mm)
  }
  return null
}

fun addMinutesToTime(hhmm: String, minutes: Int): String {
  val t = LocalTime.parse(parseFlexibleTime(hhmm) ?: "00:00", TIME_FMT)
  val out = t.plusMinutes(minutes.toLong())
  return TIME_FMT.format(out)
}

fun addHoursToTime(hhmm: String, hours: Int): String {
  return addMinutesToTime(hhmm, hours * 60)
}

fun generateSimplePreview(
  days: Set<DayCode>,
  start: String,
  activeHours: Int,
  offsetMin: Int,
  previewDays: Int
): List<String> {
  val base = parseFlexibleTime(start) ?: return emptyList()
  val firstRunTime = LocalTime.parse(addMinutesToTime(base, offsetMin), TIME_FMT)
  val hours = activeHours.coerceAtLeast(1)
  val now = LocalDateTime.now()

  fun dowToDayCode(dow: java.time.DayOfWeek): DayCode = when (dow) {
    java.time.DayOfWeek.MONDAY -> DayCode.MON
    java.time.DayOfWeek.TUESDAY -> DayCode.TUE
    java.time.DayOfWeek.WEDNESDAY -> DayCode.WED
    java.time.DayOfWeek.THURSDAY -> DayCode.THU
    java.time.DayOfWeek.FRIDAY -> DayCode.FRI
    java.time.DayOfWeek.SATURDAY -> DayCode.SAT
    java.time.DayOfWeek.SUNDAY -> DayCode.SUN
  }

  val out = mutableListOf<LocalDateTime>()
  for (dOff in 0 until previewDays.coerceAtLeast(1)) {
    val day: LocalDate = LocalDate.now().plusDays(dOff.toLong())
    val dayCode = dowToDayCode(day.dayOfWeek)
    if (!days.contains(dayCode)) continue
    val first = LocalDateTime.of(day, firstRunTime)
    for (h in 0 until hours) {
      val runAt = first.plusHours(h.toLong())
      if (runAt.isAfter(now)) out.add(runAt)
    }
  }

  out.sort()
  return out.take(50).map { dt ->
    val mins = ChronoUnit.MINUTES.between(now, dt)
    "${dt.toLocalDate()} ${dt.toLocalTime().truncatedTo(ChronoUnit.MINUTES)}  (+${mins}dk)"
  }
}

