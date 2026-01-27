package com.suleymanturan15.mousescheduler.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.suleymanturan15.mousescheduler.util.DayCode
import com.suleymanturan15.mousescheduler.util.addHoursToTime
import com.suleymanturan15.mousescheduler.util.addMinutesToTime
import com.suleymanturan15.mousescheduler.util.generateSimplePreview
import com.suleymanturan15.mousescheduler.util.parseFlexibleTime

private val ALL_DAYS = listOf(
  DayCode.MON,
  DayCode.TUE,
  DayCode.WED,
  DayCode.THU,
  DayCode.FRI,
  DayCode.SAT,
  DayCode.SUN
)

@Composable
fun SimplePanelScreen() {
  var start by remember { mutableStateOf("09:00") }
  var activeHours by remember { mutableStateOf("23") }
  var offsetMin by remember { mutableStateOf("2") }
  var previewDays by remember { mutableStateOf("30") }
  var days by remember { mutableStateOf(setOf(DayCode.MON, DayCode.TUE, DayCode.WED, DayCode.THU, DayCode.FRI)) }

  val parsedStart = parseFlexibleTime(start)
  val hours = activeHours.toIntOrNull()?.coerceAtLeast(1) ?: 1
  val offset = offsetMin.toIntOrNull()?.coerceAtLeast(0) ?: 0
  val pdays = previewDays.toIntOrNull()?.coerceAtLeast(1) ?: 30

  val base = parsedStart ?: start
  val firstRun = addMinutesToTime(base, offset)
  val endExclusive = addMinutesToTime(addHoursToTime(base, hours), offset)
  val preview = generateSimplePreview(
    days = days,
    start = base,
    activeHours = hours,
    offsetMin = offset,
    previewDays = pdays
  )

  Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    Text("Scheduler — Basit Panel")
    Text("Başlangıç saati + günde kaç saat aktif + her saat çalış (+ offset).")

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      OutlinedTextField(
        value = start,
        onValueChange = { start = it },
        label = { Text("Başlangıç") },
        singleLine = true,
        modifier = Modifier.weight(1f)
      )
      OutlinedTextField(
        value = activeHours,
        onValueChange = { activeHours = it },
        label = { Text("Aktif saat") },
        singleLine = true,
        modifier = Modifier.weight(1f)
      )
      OutlinedTextField(
        value = offsetMin,
        onValueChange = { offsetMin = it },
        label = { Text("Offset (dk)") },
        singleLine = true,
        modifier = Modifier.weight(1f)
      )
    }

    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      OutlinedTextField(
        value = previewDays,
        onValueChange = { previewDays = it },
        label = { Text("Önizleme gün") },
        singleLine = true,
        modifier = Modifier.weight(1f)
      )
      Button(
        onClick = {
          // sadece normalize etmek için
          val t = parseFlexibleTime(start)
          if (t != null) start = t
        },
        modifier = Modifier.align(Alignment.CenterVertically)
      ) {
        Text("Normalize")
      }
    }

    Divider()

    Text("Günler")
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      ALL_DAYS.chunked(4).forEach { chunk ->
        Column {
          chunk.forEach { d ->
            Row(verticalAlignment = Alignment.CenterVertically) {
              Checkbox(
                checked = days.contains(d),
                onCheckedChange = { checked ->
                  days = if (checked) days + d else days - d
                }
              )
              Text(d.label)
            }
          }
        }
      }
    }

    Divider()

    Text("Preview: her 60dk, $firstRun .. önce $endExclusive")
    Spacer(modifier = Modifier.height(6.dp))

    LazyColumn(modifier = Modifier.fillMaxWidth().height(260.dp)) {
      items(preview) { line ->
        Text(line)
      }
    }

    Spacer(modifier = Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
      Button(onClick = { previewDays = "1"; days = ALL_DAYS.toSet() }) { Text("Günlük preset") }
      Button(onClick = { previewDays = "30" }) { Text("Aylık preset") }
      Button(onClick = { previewDays = "365" }) { Text("Yıllık preset") }
    }
  }
}

