package com.whatsappai.assistant.data.repository

import com.whatsappai.assistant.core.network.NetworkResult
import com.whatsappai.assistant.core.storage.TokenManager
import com.whatsappai.assistant.data.api.ApiService
import com.whatsappai.assistant.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response

abstract class BaseRepository {
    protected suspend fun <T> safeApiCall(apiCall: suspend () -> Response<ApiResponse<T>>): NetworkResult<T> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiCall()
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success && body.data != null) {
                        NetworkResult.Success(body.data)
                    } else if (body != null && body.success) {
                        @Suppress("UNCHECKED_CAST")
                        NetworkResult.Success(Unit as T)
                    } else {
                        NetworkResult.Error(
                            message = body?.error?.message ?: body?.message ?: "Unknown server error",
                            code = body?.error?.code
                        )
                    }
                } else {
                    NetworkResult.Error(
                        message = "HTTP ${response.code()}: ${response.message()}",
                        statusCode = response.code()
                    )
                }
            } catch (e: Exception) {
                NetworkResult.Error(message = e.localizedMessage ?: "Network connection error")
            }
        }
    }
}

class AuthRepository(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : BaseRepository() {

    suspend fun register(request: RegisterRequest): NetworkResult<AuthResponseData> {
        val result = safeApiCall { apiService.register(request) }
        if (result is NetworkResult.Success) {
            tokenManager.saveAuthData(
                token = result.data.token,
                userId = result.data.user.id,
                email = result.data.user.email,
                fullName = result.data.user.fullName
            )
        }
        return result
    }

    suspend fun login(request: LoginRequest): NetworkResult<AuthResponseData> {
        val result = safeApiCall { apiService.login(request) }
        if (result is NetworkResult.Success) {
            tokenManager.saveAuthData(
                token = result.data.token,
                userId = result.data.user.id,
                email = result.data.user.email,
                fullName = result.data.user.fullName
            )
        }
        return result
    }

    suspend fun getMe(): NetworkResult<AuthResponseData> {
        return safeApiCall { apiService.getMe() }
    }

    fun logout() {
        tokenManager.clear()
    }

    fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()
}

class WhatsAppRepository(private val apiService: ApiService) : BaseRepository() {
    suspend fun connect(): NetworkResult<ConnectWhatsAppResponse> = safeApiCall { apiService.connectWhatsApp() }
    suspend fun disconnect(): NetworkResult<Any> = safeApiCall { apiService.disconnectWhatsApp() }
    suspend fun destroy(): NetworkResult<Any> = safeApiCall { apiService.destroyWhatsApp() }
    suspend fun getStatus(): NetworkResult<WhatsAppStatusDTO> = safeApiCall { apiService.getWhatsAppStatus() }
    suspend fun getQrCode(): NetworkResult<QrResponseData> = safeApiCall { apiService.getWhatsAppQr() }
}

class AISettingsRepository(private val apiService: ApiService) : BaseRepository() {
    suspend fun getSettings(): NetworkResult<AISettingsDTO> = safeApiCall { apiService.getAISettings() }
    suspend fun updateSettings(request: UpdateAISettingsRequest): NetworkResult<AISettingsDTO> =
        safeApiCall { apiService.updateAISettings(request) }
}

class ContactsRepository(private val apiService: ApiService) : BaseRepository() {
    suspend fun listContacts(): NetworkResult<List<ContactDTO>> = safeApiCall { apiService.listContacts() }
    suspend fun updateContactRule(contactId: String, request: UpdateContactRuleRequest): NetworkResult<ContactDTO> =
        safeApiCall { apiService.updateContactRule(contactId, request) }
    suspend fun getGroupRule(groupJid: String): NetworkResult<GroupRuleDTO> =
        safeApiCall { apiService.getGroupRule(groupJid) }
    suspend fun updateGroupRule(groupJid: String, request: UpdateGroupRuleRequest): NetworkResult<GroupRuleDTO> =
        safeApiCall { apiService.updateGroupRule(groupJid, request) }
}

class BusinessHoursRepository(private val apiService: ApiService) : BaseRepository() {
    suspend fun getSchedule(): NetworkResult<List<BusinessHourDTO>> = safeApiCall { apiService.getBusinessHours() }
    suspend fun updateSchedule(request: UpdateBusinessHoursRequest): NetworkResult<List<BusinessHourDTO>> =
        safeApiCall { apiService.updateBusinessHours(request) }
}

class ConversationsRepository(private val apiService: ApiService) : BaseRepository() {
    suspend fun listConversations(limit: Int = 50, offset: Int = 0, search: String? = null): NetworkResult<List<ConversationDTO>> =
        safeApiCall { apiService.listConversations(limit, offset, search) }

    suspend fun getMessages(conversationId: String, limit: Int = 50, offset: Int = 0): NetworkResult<List<MessageDTO>> =
        safeApiCall { apiService.getMessages(conversationId, limit, offset) }

    suspend fun takeover(conversationId: String, durationMinutes: Int? = null): NetworkResult<ConversationDTO> =
        safeApiCall { apiService.takeover(conversationId, TakeoverRequest(durationMinutes)) }

    suspend fun resumeAi(conversationId: String): NetworkResult<ConversationDTO> =
        safeApiCall { apiService.resumeAI(conversationId) }

    suspend fun sendMessage(conversationId: String, text: String): NetworkResult<MessageDTO> =
        safeApiCall { apiService.sendMessage(conversationId, SendMessageRequest(text)) }
}

class DashboardRepository(private val apiService: ApiService) : BaseRepository() {
    suspend fun getStats(): NetworkResult<DashboardStatsDTO> = safeApiCall { apiService.getDashboardStats() }
}
