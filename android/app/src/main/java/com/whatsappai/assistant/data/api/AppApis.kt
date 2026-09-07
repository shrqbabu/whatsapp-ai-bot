package com.whatsappai.assistant.data.api

import com.whatsappai.assistant.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApi {
    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthResponseData>>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<AuthResponseData>>

    @GET("api/auth/me")
    suspend fun getMe(): Response<ApiResponse<AuthResponseData>>
}

interface WhatsAppApi {
    @POST("api/whatsapp/connect")
    suspend fun connect(): Response<ApiResponse<ConnectWhatsAppResponse>>

    @POST("api/whatsapp/disconnect")
    suspend fun disconnect(): Response<ApiResponse<Any>>

    @POST("api/whatsapp/destroy")
    suspend fun destroy(): Response<ApiResponse<Any>>

    @GET("api/whatsapp/status")
    suspend fun getStatus(): Response<ApiResponse<WhatsAppStatusDTO>>

    @GET("api/whatsapp/qr")
    suspend fun getQrCode(): Response<ApiResponse<QrResponseData>>
}

interface AIApi {
    @GET("api/ai/settings")
    suspend fun getSettings(): Response<ApiResponse<AISettingsDTO>>

    @PUT("api/ai/settings")
    suspend fun updateSettings(@Body request: UpdateAISettingsRequest): Response<ApiResponse<AISettingsDTO>>
}

interface ContactsApi {
    @GET("api/contacts")
    suspend fun listContacts(): Response<ApiResponse<List<ContactDTO>>>

    @PUT("api/contacts/{id}/rules")
    suspend fun updateContactRules(
        @Path("id") contactId: String,
        @Body request: UpdateContactRuleRequest
    ): Response<ApiResponse<ContactDTO>>

    @GET("api/contacts/groups/{jid}/rules")
    suspend fun getGroupRule(@Path("jid") groupJid: String): Response<ApiResponse<GroupRuleDTO>>

    @PUT("api/contacts/groups/{jid}/rules")
    suspend fun updateGroupRule(
        @Path("jid") groupJid: String,
        @Body request: UpdateGroupRuleRequest
    ): Response<ApiResponse<GroupRuleDTO>>
}

interface BusinessHoursApi {
    @GET("api/business-hours")
    suspend fun getSchedule(): Response<ApiResponse<List<BusinessHourDTO>>>

    @PUT("api/business-hours")
    suspend fun updateSchedule(@Body request: UpdateBusinessHoursRequest): Response<ApiResponse<List<BusinessHourDTO>>>
}

interface ConversationsApi {
    @GET("api/conversations")
    suspend fun listConversations(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0,
        @Query("search") search: String? = null
    ): Response<ApiResponse<List<ConversationDTO>>>

    @GET("api/conversations/{id}/messages")
    suspend fun getMessages(
        @Path("id") conversationId: String,
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<ApiResponse<List<MessageDTO>>>

    @POST("api/conversations/{id}/takeover")
    suspend fun takeover(
        @Path("id") conversationId: String,
        @Body request: TakeoverRequest
    ): Response<ApiResponse<ConversationDTO>>

    @POST("api/conversations/{id}/resume")
    suspend fun resumeAi(
        @Path("id") conversationId: String
    ): Response<ApiResponse<ConversationDTO>>

    @POST("api/conversations/{id}/send")
    suspend fun sendMessage(
        @Path("id") conversationId: String,
        @Body request: SendMessageRequest
    ): Response<ApiResponse<MessageDTO>>
}

interface DashboardApi {
    @GET("api/dashboard/stats")
    suspend fun getStats(): Response<ApiResponse<DashboardStatsDTO>>
}
