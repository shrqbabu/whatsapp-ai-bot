package com.whatsappai.assistant

import android.app.Application
import com.whatsappai.assistant.core.network.ApiClient
import com.whatsappai.assistant.core.network.WebSocketManager
import com.whatsappai.assistant.core.storage.TokenManager
import com.whatsappai.assistant.data.api.ApiService
import com.whatsappai.assistant.data.repository.*

class WhatsAppAiApplication : Application() {

    lateinit var tokenManager: TokenManager
        private set

    lateinit var apiClient: ApiClient
        private set

    lateinit var apiService: ApiService
        private set

    lateinit var webSocketManager: WebSocketManager
        private set

    lateinit var authRepository: AuthRepository
        private set

    lateinit var whatsAppRepository: WhatsAppRepository
        private set

    lateinit var aiRepository: AIRepository
        private set

    lateinit var contactsRepository: ContactsRepository
        private set

    lateinit var businessHoursRepository: BusinessHoursRepository
        private set

    lateinit var conversationsRepository: ConversationsRepository
        private set

    lateinit var dashboardRepository: DashboardRepository
        private set

    override fun onCreate() {
        super.onCreate()

        tokenManager = TokenManager(this)
        apiClient = ApiClient(tokenManager)
        apiService = apiClient.createService(ApiService::class.java)
        webSocketManager = WebSocketManager(tokenManager)

        authRepository = AuthRepository(apiService, tokenManager)
        whatsAppRepository = WhatsAppRepository(apiService)
        aiRepository = AIRepository(apiService)
        contactsRepository = ContactsRepository(apiService)
        businessHoursRepository = BusinessHoursRepository(apiService)
        conversationsRepository = ConversationsRepository(apiService)
        dashboardRepository = DashboardRepository(apiService)

        // Automatically connect WebSocket if user is already logged in
        if (tokenManager.isLoggedIn()) {
            webSocketManager.connect()
        }
    }
}
