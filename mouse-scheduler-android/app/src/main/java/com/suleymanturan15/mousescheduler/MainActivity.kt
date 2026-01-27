package com.suleymanturan15.mousescheduler

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.suleymanturan15.mousescheduler.ui.SimplePanelScreen

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      App()
    }
  }
}

@Composable
private fun App() {
  MaterialTheme {
    Surface(modifier = Modifier.fillMaxSize()) {
      SimplePanelScreen()
    }
  }
}

