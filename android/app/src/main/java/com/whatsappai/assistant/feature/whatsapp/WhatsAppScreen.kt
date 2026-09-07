package com.whatsappai.assistant.feature.whatsapp

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.whatsappai.assistant.core.network.NetworkResult
import com.whatsappai.assistant.core.network.WebSocketManager
import com.whatsappai.assistant.core.network.WsEvent
import com.whatsappai.assistant.core.theme.*
import com.whatsappai.assistant.core.ui.components.*
import com.whatsappai.assistant.data.model.WhatsAppStatusDTO
import com.whatsappai.assistant.data.repository.WhatsAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class WhatsAppConnectionUiState(
    val isLoading: Boolean = false,
    val status: String = "DISCONNECTED",
    val phoneNumber: String? = null,
    val qrCode: String? = null,
    val errorMessage: String? = null
)

class WhatsAppViewModel(
    private val whatsAppRepository: WhatsAppRepository,
    private val webSocketManager: WebSocketManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(WhatsAppConnectionUiState(isLoading = true))
    val uiState: StateFlow<WhatsAppConnectionUiState> = _uiState.asStateFlow()

    init {
        fetchStatus()
        observeWebSocket()
    }

    fun fetchStatus() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            when (val result = whatsAppRepository.getStatus()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        status = result.data.status,
                        phoneNumber = result.data.phoneNumber,
                        qrCode = result.data.qr
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    fun connectWhatsApp() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            when (val result = whatsAppRepository.connect()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        status = result.data.status,
                        qrCode = result.data.qr
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    fun disconnectWhatsApp() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = whatsAppRepository.disconnect()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        status = "DISCONNECTED",
                        qrCode = null
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    fun unlinkSession() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val result = whatsAppRepository.destroy()) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        status = "DISCONNECTED",
                        phoneNumber = null,
                        qrCode = null
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    private fun observeWebSocket() {
        viewModelScope.launch {
            webSocketManager.events.collect { event ->
                when (event) {
                    is WsEvent.StatusUpdate -> {
                        _uiState.value = _uiState.value.copy(
                            status = event.status,
                            phoneNumber = event.phoneNumber ?: _uiState.value.phoneNumber
                        )
                    }
                    is WsEvent.QrUpdate -> {
                        _uiState.value = _uiState.value.copy(
                            status = "QR_REQUIRED",
                            qrCode = event.qr
                        )
                    }
                    is WsEvent.Connected -> {
                        _uiState.value = _uiState.value.copy(
                            status = "CONNECTED",
                            phoneNumber = event.phoneNumber,
                            qrCode = null
                        )
                    }
                    is WsEvent.Disconnected -> {
                        _uiState.value = _uiState.value.copy(
                            status = "DISCONNECTED",
                            qrCode = null
                        )
                    }
                    is WsEvent.Reconnecting -> {
                        _uiState.value = _uiState.value.copy(
                            status = "RECONNECTING"
                        )
                    }
                    is WsEvent.LoggedOut -> {
                        _uiState.value = _uiState.value.copy(
                            status = "LOGGED_OUT",
                            phoneNumber = null,
                            qrCode = null
                        )
                    }
                    else -> {}
                }
            }
        }
    }
}

@Composable
fun WhatsAppConnectionScreen(
    viewModel: WhatsAppViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToQr: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var showUnlinkDialog by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.status) {
        if (uiState.status == "QR_REQUIRED") {
            onNavigateToQr()
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "WhatsApp Connection",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            if (uiState.errorMessage != null) {
                ErrorBanner(
                    message = uiState.errorMessage!!,
                    onRetry = { viewModel.fetchStatus() }
                )
            }

            // Connection Status Hero Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Surface(
                        shape = CircleShape,
                        color = when (uiState.status.uppercase()) {
                            "CONNECTED" -> StatusConnected.copy(alpha = 0.15f)
                            "CONNECTING", "RECONNECTING" -> StatusConnecting.copy(alpha = 0.15f)
                            "QR_REQUIRED" -> StatusQrRequired.copy(alpha = 0.15f)
                            else -> StatusDisconnected.copy(alpha = 0.15f)
                        },
                        modifier = Modifier.size(80.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (uiState.status == "CONNECTED") Icons.Default.CheckCircle else Icons.Default.QrCodeScanner,
                                contentDescription = null,
                                tint = when (uiState.status.uppercase()) {
                                    "CONNECTED" -> StatusConnected
                                    "CONNECTING", "RECONNECTING" -> StatusConnecting
                                    "QR_REQUIRED" -> StatusQrRequired
                                    else -> StatusDisconnected
                                },
                                modifier = Modifier.size(44.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    StatusBadge(status = uiState.status)

                    Spacer(modifier = Modifier.height(10.dp))

                    if (!uiState.phoneNumber.isNullOrBlank()) {
                        Text(
                            text = "+${uiState.phoneNumber}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Linked WhatsApp Multi-Device Session",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    } else {
                        Text(
                            text = "No WhatsApp Account Linked",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Connect your account to start AI auto-replies",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }

            // Action Buttons
            if (uiState.status == "CONNECTED") {
                Button(
                    onClick = { viewModel.disconnectWhatsApp() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    enabled = !uiState.isLoading
                ) {
                    Icon(Icons.Default.PowerSettingsNew, contentDescription = null, tint = MaterialTheme.colorScheme.onSurface)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Disconnect Session", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = { showUnlinkDialog = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Unlink & Clear Session Auth", fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = {
                        viewModel.connectWhatsApp()
                        onNavigateToQr()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = WhatsAppGreenPrimary),
                    enabled = !uiState.isLoading
                ) {
                    Icon(Icons.Default.QrCode, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Connect WhatsApp (Scan QR)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Instructions Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "How to Pair WhatsApp:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    InstructionStep(number = "1", text = "Open WhatsApp on your phone")
                    InstructionStep(number = "2", text = "Go to Settings (or 3 dots) → Linked Devices")
                    InstructionStep(number = "3", text = "Tap 'Link a Device'")
                    InstructionStep(number = "4", text = "Point your phone camera at the QR code")
                }
            }
        }
    }

    if (showUnlinkDialog) {
        ConfirmDialog(
            title = "Unlink WhatsApp Account?",
            message = "This will delete the saved authentication keys on the server. You will need to scan the QR code again to reconnect.",
            confirmText = "Unlink",
            isDestructive = true,
            onConfirm = {
                viewModel.unlinkSession()
                showUnlinkDialog = false
            },
            onDismiss = { showUnlinkDialog = false }
        )
    }
}

@Composable
fun InstructionStep(number: String, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            shape = CircleShape,
            color = WhatsAppGreenPrimary.copy(alpha = 0.15f),
            modifier = Modifier.size(24.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(text = number, color = WhatsAppGreenPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(modifier = Modifier.width(10.dp))
        Text(text = text, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun QRCodeScreen(
    viewModel: WhatsAppViewModel,
    onNavigateBack: () -> Unit,
    onConnected: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.status) {
        if (uiState.status == "CONNECTED") {
            onConnected()
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Pair WhatsApp",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "Scan QR Code",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Scan from WhatsApp → Linked Devices",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            // QR Code Renderer
            QRCodeImage(
                qrBase64 = uiState.qrCode,
                onRefresh = { viewModel.connectWhatsApp() },
                modifier = Modifier.size(280.dp)
            )

            Spacer(modifier = Modifier.height(20.dp))

            StatusBadge(status = uiState.status)

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = { viewModel.connectWhatsApp() },
                colors = ButtonDefaults.buttonColors(containerColor = WhatsAppGreenPrimary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Refresh QR Code")
            }
        }
    }
}
