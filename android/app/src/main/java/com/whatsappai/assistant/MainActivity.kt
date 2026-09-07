package com.whatsappai.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.navigation.compose.rememberNavController
import com.whatsappai.assistant.core.theme.WhatsAppAiTheme
import com.whatsappai.assistant.navigation.AppNavigation
import com.whatsappai.assistant.navigation.Screen

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as WhatsAppAiApplication
        val startDestination = if (app.tokenManager.isLoggedIn()) {
            Screen.Dashboard.route
        } else {
            Screen.Auth.route
        }

        setContent {
            WhatsAppAiTheme {
                val navController = rememberNavController()
                AppNavigation(
                    navController = navController,
                    startDestination = startDestination
                )
            }
        }
    }
}
