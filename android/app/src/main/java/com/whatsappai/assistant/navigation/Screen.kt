package com.whatsappai.assistant.navigation

sealed class Screen(val route: String) {
    object Auth : Screen("auth")
    object Dashboard : Screen("dashboard")
    object WhatsAppConnection : Screen("whatsapp_connection")
    object QRCode : Screen("qr_code")
    object AISettings : Screen("ai_settings")
    object ContactRules : Screen("contact_rules")
    object GroupRules : Screen("group_rules")
    object BusinessHours : Screen("business_hours")
    object Conversations : Screen("conversations")
    object ChatDetail : Screen("chat_detail/{conversationId}") {
        fun createRoute(conversationId: String) = "chat_detail/$conversationId"
    }
    object ManualTakeover : Screen("manual_takeover")
    object SessionSettings : Screen("session_settings")
    object Profile : Screen("profile")
}
