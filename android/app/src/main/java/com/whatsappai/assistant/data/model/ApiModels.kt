package com.whatsappai.assistant.data.model

import com.google.gson.annotations.SerializedName

// Generic API response wrapper
data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T?,
    @SerializedName("message") val message: String?,
    @SerializedName("error") val error: ApiError?
)

data class ApiError(
    @SerializedName("code") val code: String?,
    @SerializedName("message") val message: String?,
    @SerializedName("details") val details: Any?
)

// Auth Models
data class RegisterRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("fullName") val fullName: String
)

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class AuthResponseData(
    @SerializedName("token") val token: String,
    @SerializedName("user") val user: UserDTO,
    @SerializedName("session") val session: SessionSummaryDTO
)

data class UserDTO(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("createdAt") val createdAt: String?
)

data class SessionSummaryDTO(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String,
    @SerializedName("phoneNumber") val phoneNumber: String?
)

// WhatsApp Models
data class WhatsAppStatusDTO(
    @SerializedName("status") val status: String,
    @SerializedName("phoneNumber") val phoneNumber: String?,
    @SerializedName("qr") val qr: String?,
    @SerializedName("connectedAt") val connectedAt: String?
)

data class ConnectWhatsAppResponse(
    @SerializedName("status") val status: String,
    @SerializedName("qr") val qr: String?
)

data class QrResponseData(
    @SerializedName("qr") val qr: String?
)

// AI Settings Models
data class AISettingsDTO(
    @SerializedName("id") val id: String?,
    @SerializedName("session_id") val sessionId: String?,
    @SerializedName("enabled") val enabled: Boolean,
    @SerializedName("system_prompt") val systemPrompt: String,
    @SerializedName("model") val model: String,
    @SerializedName("reply_delay") val replyDelay: Int,
    @SerializedName("debounce_delay") val debounceDelay: Int,
    @SerializedName("groups_enabled") val groupsEnabled: Boolean,
    @SerializedName("reply_only_when_mentioned") val replyOnlyWhenMentioned: Boolean,
    @SerializedName("business_hours_enabled") val businessHoursEnabled: Boolean
)

data class UpdateAISettingsRequest(
    @SerializedName("enabled") val enabled: Boolean? = null,
    @SerializedName("system_prompt") val systemPrompt: String? = null,
    @SerializedName("model") val model: String? = null,
    @SerializedName("reply_delay") val replyDelay: Int? = null,
    @SerializedName("debounce_delay") val debounceDelay: Int? = null,
    @SerializedName("groups_enabled") val groupsEnabled: Boolean? = null,
    @SerializedName("reply_only_when_mentioned") val replyOnlyWhenMentioned: Boolean? = null,
    @SerializedName("business_hours_enabled") val businessHoursEnabled: Boolean? = null
)

// Contacts & Rules Models
data class ContactDTO(
    @SerializedName("id") val id: String,
    @SerializedName("session_id") val sessionId: String?,
    @SerializedName("wa_jid") val waJid: String,
    @SerializedName("display_name") val displayName: String?,
    @SerializedName("phone_number") val phoneNumber: String?,
    @SerializedName("ai_enabled") val aiEnabled: Boolean,
    @SerializedName("blocked") val blocked: Boolean,
    @SerializedName("updated_at") val updatedAt: String?
)

data class UpdateContactRuleRequest(
    @SerializedName("ai_enabled") val aiEnabled: Boolean? = null,
    @SerializedName("blocked") val blocked: Boolean? = null
)

data class GroupRuleDTO(
    @SerializedName("id") val id: String?,
    @SerializedName("group_jid") val groupJid: String,
    @SerializedName("ai_enabled") val aiEnabled: Boolean,
    @SerializedName("reply_only_when_mentioned") val replyOnlyWhenMentioned: Boolean
)

data class UpdateGroupRuleRequest(
    @SerializedName("ai_enabled") val aiEnabled: Boolean? = null,
    @SerializedName("reply_only_when_mentioned") val replyOnlyWhenMentioned: Boolean? = null
)

// Business Hours Models
data class BusinessHourDTO(
    @SerializedName("id") val id: String?,
    @SerializedName("day_of_week") val dayOfWeek: Int, // 0=Sun, 1=Mon...
    @SerializedName("enabled") val enabled: Boolean,
    @SerializedName("start_time") val startTime: String, // "09:00"
    @SerializedName("end_time") val endTime: String, // "18:00"
    @SerializedName("timezone") val timezone: String,
    @SerializedName("outside_hours_action") val outsideHoursAction: String, // 'DO_NOTHING' | 'SEND_CUSTOM_MESSAGE'
    @SerializedName("outside_hours_message") val outsideHoursMessage: String?
)

data class UpdateBusinessHoursRequest(
    @SerializedName("schedule") val schedule: List<BusinessHourDTO>
)

// Conversations & Messages Models
data class ConversationDTO(
    @SerializedName("id") val id: String,
    @SerializedName("session_id") val sessionId: String?,
    @SerializedName("chat_jid") val chatJid: String,
    @SerializedName("chat_name") val chatName: String?,
    @SerializedName("is_group") val isGroup: Boolean,
    @SerializedName("takeover_active") val takeoverActive: Boolean,
    @SerializedName("takeover_until") val takeoverUntil: String?,
    @SerializedName("last_message_at") val lastMessageAt: String?,
    @SerializedName("last_message_preview") val lastMessagePreview: String?
)

data class MessageDTO(
    @SerializedName("id") val id: String,
    @SerializedName("conversation_id") val conversationId: String,
    @SerializedName("wa_message_id") val waMessageId: String,
    @SerializedName("direction") val direction: String, // 'INCOMING' | 'OUTGOING'
    @SerializedName("sender") val sender: String,
    @SerializedName("receiver") val receiver: String,
    @SerializedName("message_type") val messageType: String,
    @SerializedName("text") val text: String?,
    @SerializedName("is_from_me") val isFromMe: Boolean,
    @SerializedName("ai_generated") val aiGenerated: Boolean,
    @SerializedName("created_at") val createdAt: String?
)

data class TakeoverRequest(
    @SerializedName("duration_minutes") val durationMinutes: Int? = null
)

data class SendMessageRequest(
    @SerializedName("text") val text: String
)

// Dashboard Models
data class DashboardStatsDTO(
    @SerializedName("whatsappStatus") val whatsappStatus: String,
    @SerializedName("aiEnabled") val aiEnabled: Boolean,
    @SerializedName("todayMessages") val todayMessages: Int,
    @SerializedName("todayAiReplies") val todayAiReplies: Int,
    @SerializedName("activeConversations") val activeConversations: Int,
    @SerializedName("pendingTakeover") val pendingTakeover: Int,
    @SerializedName("phoneNumber") val phoneNumber: String?
)
