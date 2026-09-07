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

data class WsEvent(
    val event: String,
    val rawData: JsonObject,
    val timestamp: String?
)

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
                    val event = json.get("event")?.asString ?: "unknown"
                    val data = json.getAsJsonObject("data") ?: JsonObject()
                    val timestamp = json.get("timestamp")?.asString

                    scope.launch {
                        _eventFlow.emit(WsEvent(event, data, timestamp))
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
