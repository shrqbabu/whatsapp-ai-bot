package com.whatsappai.assistant.core.network

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.whatsappai.assistant.core.storage.TokenManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

sealed class WsEvent {
    data class StatusUpdate(val status: String, val phoneNumber: String?) : WsEvent()
    data class Connected(val phoneNumber: String?) : WsEvent()
    object Disconnected : WsEvent()
    object Reconnecting : WsEvent()
    object LoggedOut : WsEvent()
    data class QrUpdate(val qr: String) : WsEvent()
    data class MessageReceived(val conversationId: String?, val rawData: JsonObject) : WsEvent()
    data class MessageSent(val conversationId: String?, val rawData: JsonObject) : WsEvent()
    data class AiReplied(val conversationId: String?, val rawData: JsonObject) : WsEvent()
    data class TakeoverChanged(val conversationId: String, val active: Boolean) : WsEvent()
    data class Unknown(val event: String, val rawData: JsonObject) : WsEvent()
}

enum class WsConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    RECONNECTING
}

class WebSocketManager(
    private val tokenManager: TokenManager
) {
    private val gson = Gson()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var webSocket: WebSocket? = null
    private var isExplicitlyClosed = false
    private var reconnectAttempt = 0

    private val client = OkHttpClient.Builder()
        .pingInterval(25, TimeUnit.SECONDS)
        .build()

    private val _connectionState = MutableStateFlow(WsConnectionState.DISCONNECTED)
    val connectionState: StateFlow<WsConnectionState> = _connectionState.asStateFlow()

    private val _eventFlow = MutableSharedFlow<WsEvent>(extraBufferCapacity = 64)
    val eventFlow: SharedFlow<WsEvent> = _eventFlow.asSharedFlow()

    /** Alias used by feature screens */
    val events: SharedFlow<WsEvent> get() = eventFlow

    fun connect() {
        val token = tokenManager.getToken()
        if (token.isNullOrBlank()) {
            _connectionState.value = WsConnectionState.DISCONNECTED
            return
        }

        isExplicitlyClosed = false
        _connectionState.value = WsConnectionState.CONNECTING

        val baseUrl = tokenManager.getServerUrl()
            .replace("http://", "ws://")
            .replace("https://", "wss://")
            .trimEnd('/')

        val wsUrl = "$baseUrl/ws?token=$token"

        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                reconnectAttempt = 0
                _connectionState.value = WsConnectionState.CONNECTED
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = gson.fromJson(text, JsonObject::class.java)
                    val eventName = json.get("event")?.asString ?: "unknown"
                    val data = json.getAsJsonObject("data") ?: JsonObject()

                    val wsEvent = parseEvent(eventName, data)

                    scope.launch {
                        _eventFlow.emit(wsEvent)
                    }
                } catch (e: Exception) {
                    // Ignore parse errors
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _connectionState.value = WsConnectionState.DISCONNECTED
                if (!isExplicitlyClosed) {
                    scheduleReconnect()
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _connectionState.value = WsConnectionState.DISCONNECTED
                if (!isExplicitlyClosed) {
                    scheduleReconnect()
                }
            }
        })
    }

    private fun parseEvent(eventName: String, data: JsonObject): WsEvent {
        return when (eventName) {
            "status_update", "whatsapp:status" -> {
                val status = data.get("status")?.asString ?: "UNKNOWN"
                val phone = data.get("phoneNumber")?.asString
                WsEvent.StatusUpdate(status, phone)
            }
            "connected", "whatsapp:connected" -> {
                val phone = data.get("phoneNumber")?.asString
                WsEvent.Connected(phone)
            }
            "disconnected", "whatsapp:disconnected" -> WsEvent.Disconnected
            "reconnecting", "whatsapp:reconnecting" -> WsEvent.Reconnecting
            "logged_out", "whatsapp:logged_out" -> WsEvent.LoggedOut
            "qr", "qr_update", "whatsapp:qr" -> {
                val qr = data.get("qr")?.asString ?: ""
                WsEvent.QrUpdate(qr)
            }
            "message_received", "message:received" -> {
                val convId = data.get("conversationId")?.asString ?: data.get("conversation_id")?.asString
                WsEvent.MessageReceived(convId, data)
            }
            "message_sent", "message:sent" -> {
                val convId = data.get("conversationId")?.asString ?: data.get("conversation_id")?.asString
                WsEvent.MessageSent(convId, data)
            }
            "ai_replied", "message:ai_replied" -> {
                val convId = data.get("conversationId")?.asString ?: data.get("conversation_id")?.asString
                WsEvent.AiReplied(convId, data)
            }
            "takeover_changed", "takeover:changed" -> {
                val convId = data.get("conversationId")?.asString ?: data.get("conversation_id")?.asString ?: ""
                val active = data.get("active")?.asBoolean ?: false
                WsEvent.TakeoverChanged(convId, active)
            }
            else -> WsEvent.Unknown(eventName, data)
        }
    }

    private fun scheduleReconnect() {
        scope.launch {
            if (isExplicitlyClosed) return@launch

            reconnectAttempt++
            _connectionState.value = WsConnectionState.RECONNECTING
            val delayMs = (reconnectAttempt * 2000L).coerceAtMost(10000L)
            delay(delayMs)
            connect()
        }
    }

    fun disconnect() {
        isExplicitlyClosed = true
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        _connectionState.value = WsConnectionState.DISCONNECTED
    }
}
