package com.whatsappai.assistant.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.whatsappai.assistant.WhatsAppAiApplication
import com.whatsappai.assistant.feature.ai.AISettingsScreen
import com.whatsappai.assistant.feature.ai.AISettingsViewModel
import com.whatsappai.assistant.feature.auth.AuthScreen
import com.whatsappai.assistant.feature.auth.AuthViewModel
import com.whatsappai.assistant.feature.businesshours.BusinessHoursScreen
import com.whatsappai.assistant.feature.businesshours.BusinessHoursViewModel
import com.whatsappai.assistant.feature.contacts.ContactRulesScreen
import com.whatsappai.assistant.feature.contacts.ContactsViewModel
import com.whatsappai.assistant.feature.conversations.ChatDetailScreen
import com.whatsappai.assistant.feature.conversations.ConversationsListScreen
import com.whatsappai.assistant.feature.conversations.ConversationsViewModel
import com.whatsappai.assistant.feature.groups.GroupRulesScreen
import com.whatsappai.assistant.feature.groups.GroupRulesViewModel
import com.whatsappai.assistant.feature.dashboard.DashboardScreen
import com.whatsappai.assistant.feature.dashboard.DashboardViewModel
import com.whatsappai.assistant.feature.profile.ProfileScreen
import com.whatsappai.assistant.feature.profile.ProfileViewModel
import com.whatsappai.assistant.feature.profile.SessionSettingsScreen
import com.whatsappai.assistant.feature.whatsapp.QRCodeScreen
import com.whatsappai.assistant.feature.whatsapp.WhatsAppConnectionScreen
import com.whatsappai.assistant.feature.whatsapp.WhatsAppViewModel

@Composable
fun AppNavigation(
    navController: NavHostController,
    startDestination: String
) {
    val context = LocalContext.current
    val app = context.applicationContext as WhatsAppAiApplication

    // Instantiating ViewModels with Application dependencies
    val authViewModel = remember { AuthViewModel(app.authRepository, app.tokenManager) }
    val dashboardViewModel = remember { DashboardViewModel(app.dashboardRepository, app.webSocketManager) }
    val whatsAppViewModel = remember { WhatsAppViewModel(app.whatsAppRepository, app.webSocketManager) }
    val aiSettingsViewModel = remember { AISettingsViewModel(app.aiRepository) }
    val contactsViewModel = remember { ContactsViewModel(app.contactsRepository) }
    val groupRulesViewModel = remember { GroupRulesViewModel(app.aiRepository) }
    val businessHoursViewModel = remember { BusinessHoursViewModel(app.businessHoursRepository) }
    val conversationsViewModel = remember { ConversationsViewModel(app.conversationsRepository, app.webSocketManager) }
    val profileViewModel = remember { ProfileViewModel(app.authRepository, app.whatsAppRepository, app.tokenManager, app.webSocketManager) }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // 1. Auth Screen
        composable(Screen.Auth.route) {
            AuthScreen(
                viewModel = authViewModel,
                onAuthSuccess = {
                    app.webSocketManager.connect()
                    dashboardViewModel.loadStats()
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                }
            )
        }

        // 2. Dashboard Screen
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                viewModel = dashboardViewModel,
                onNavigateToWhatsApp = { navController.navigate(Screen.WhatsAppConnection.route) },
                onNavigateToAI = { navController.navigate(Screen.AISettings.route) },
                onNavigateToConversations = { navController.navigate(Screen.Conversations.route) },
                onNavigateToContacts = { navController.navigate(Screen.ContactRules.route) },
                onNavigateToGroups = { navController.navigate(Screen.GroupRules.route) },
                onNavigateToBusinessHours = { navController.navigate(Screen.BusinessHours.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) }
            )
        }

        // 3. WhatsApp Connection Screen
        composable(Screen.WhatsAppConnection.route) {
            WhatsAppConnectionScreen(
                viewModel = whatsAppViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToQr = { navController.navigate(Screen.QRCode.route) }
            )
        }

        // 4. QR Code Screen
        composable(Screen.QRCode.route) {
            QRCodeScreen(
                viewModel = whatsAppViewModel,
                onNavigateBack = { navController.popBackStack() },
                onConnected = {
                    navController.popBackStack(Screen.Dashboard.route, inclusive = false)
                }
            )
        }

        // 5. AI Settings Screen
        composable(Screen.AISettings.route) {
            AISettingsScreen(
                viewModel = aiSettingsViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // 6. Contact Rules Screen
        composable(Screen.ContactRules.route) {
            ContactRulesScreen(
                viewModel = contactsViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // 7. Group Rules Screen
        composable(Screen.GroupRules.route) {
            GroupRulesScreen(
                viewModel = groupRulesViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // 8. Business Hours Screen
        composable(Screen.BusinessHours.route) {
            BusinessHoursScreen(
                viewModel = businessHoursViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // 9. Conversations List Screen
        composable(Screen.Conversations.route) {
            ConversationsListScreen(
                viewModel = conversationsViewModel,
                onNavigateToChat = { conversationId ->
                    navController.navigate(Screen.ChatDetail.createRoute(conversationId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // 10. Chat Detail Screen
        composable(
            route = Screen.ChatDetail.route,
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId") ?: ""
            ChatDetailScreen(
                conversationId = conversationId,
                viewModel = conversationsViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // 11. Profile Screen
        composable(Screen.Profile.route) {
            ProfileScreen(
                viewModel = profileViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToSessionSettings = { navController.navigate(Screen.SessionSettings.route) },
                onLogout = {
                    app.webSocketManager.disconnect()
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        // 12. Session Settings Screen
        composable(Screen.SessionSettings.route) {
            SessionSettingsScreen(
                viewModel = profileViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
