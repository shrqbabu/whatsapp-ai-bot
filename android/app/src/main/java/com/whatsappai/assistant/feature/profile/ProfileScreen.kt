package com.whatsappai.assistant.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.whatsappai.assistant.core.network.NetworkResult
import com.whatsappai.assistant.core.network.WebSocketManager
import com.whatsappai.assistant.core.storage.TokenManager
import com.whatsappai.assistant.core.theme.ErrorRed
import com.whatsappai.assistant.core.theme.WhatsAppGreenDark
import com.whatsappai.assistant.core.theme.WhatsAppGreenPrimary
import com.whatsappai.assistant.core.ui.components.AppTopBar
import com.whatsappai.assistant.core.ui.components.ConfirmDialog
import com.whatsappai.assistant.core.ui.components.ErrorBanner
import com.whatsappai.assistant.core.ui.components.LoadingView
import com.whatsappai.assistant.data.model.UserDTO
import com.whatsappai.assistant.data.repository.AuthRepository
import com.whatsappai.assistant.data.repository.WhatsAppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class ProfileUiState {
    object Loading : ProfileUiState()
    data class Success(val user: UserDTO) : ProfileUiState()
    data class Error(val message: String) : ProfileUiState()
}

class ProfileViewModel(
    private val authRepository: AuthRepository,
    private val whatsAppRepository: WhatsAppRepository,
    private val tokenManager: TokenManager,
    private val webSocketManager: WebSocketManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    var customServerUrl by mutableStateOf(tokenManager.getServerUrl())
    var urlSavedMessage by mutableStateOf<String?>(null)

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = ProfileUiState.Loading
            when (val result = authRepository.getMe()) {
                is NetworkResult.Success -> {
                    _uiState.value = ProfileUiState.Success(result.data.user)
                }
                is NetworkResult.Error -> {
                    _uiState.value = ProfileUiState.Error(result.message)
                }
                else -> {}
            }
        }
    }

    fun updateServerUrl(url: String) {
        tokenManager.setServerUrl(url.trim())
        customServerUrl = url.trim()
        urlSavedMessage = "Server URL updated to $url"
    }

    fun logout(onLoggedOut: () -> Unit) {
        authRepository.logout()
        onLoggedOut()
    }

    fun unlinkWhatsApp(onSuccess: () -> Unit) {
        viewModelScope.launch {
            whatsAppRepository.destroy()
            onSuccess()
        }
    }
}

@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToSessionSettings: () -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showServerDialog by remember { mutableStateOf(false) }

    LaunchedEffect(viewModel.urlSavedMessage) {
        viewModel.urlSavedMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.urlSavedMessage = null
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Account & Settings",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            when (val state = uiState) {
                is ProfileUiState.Loading -> LoadingView("Loading account...")
                is ProfileUiState.Error -> ErrorBanner(message = state.message, onRetry = { viewModel.loadProfile() })
                is ProfileUiState.Success -> {
                    // Profile Header Card
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = WhatsAppGreenPrimary.copy(alpha = 0.15f),
                                modifier = Modifier.size(72.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.Person,
                                        contentDescription = null,
                                        tint = WhatsAppGreenDark,
                                        modifier = Modifier.size(40.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            Text(
                                text = state.user.fullName,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )

                            Text(
                                text = state.user.email,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Settings Group
                    Text(
                        text = "Preferences & Diagnostics",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(start = 4.dp)
                    )

                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            ListItem(
                                headlineContent = { Text("Session Settings") },
                                supportingContent = { Text("Manage Baileys storage and lifecycle") },
                                leadingContent = { Icon(Icons.Default.ManageAccounts, contentDescription = null, tint = WhatsAppGreenDark) },
                                trailingContent = { Icon(Icons.Default.ChevronRight, contentDescription = null) },
                                modifier = Modifier.clickable { onNavigateToSessionSettings() }
                            )

                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

                            ListItem(
                                headlineContent = { Text("Backend Server URL") },
                                supportingContent = { Text(viewModel.customServerUrl) },
                                leadingContent = { Icon(Icons.Default.Dns, contentDescription = null, tint = WhatsAppGreenDark) },
                                trailingContent = { Icon(Icons.Default.Edit, contentDescription = null) },
                                modifier = Modifier.clickable { showServerDialog = true }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Logout Button
                    Button(
                        onClick = { showLogoutDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = ErrorRed.copy(alpha = 0.12f), contentColor = ErrorRed),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        Icon(Icons.Default.Logout, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Sign Out", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    if (showLogoutDialog) {
        ConfirmDialog(
            title = "Sign Out?",
            message = "You will be returned to the login screen.",
            confirmText = "Sign Out",
            isDestructive = true,
            onConfirm = {
                showLogoutDialog = false
                viewModel.logout(onLogout)
            },
            onDismiss = { showLogoutDialog = false }
        )
    }

    if (showServerDialog) {
        var tempUrl by remember { mutableStateOf(viewModel.customServerUrl) }
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = { Text("Configure Server Host") },
            text = {
                Column {
                    Text("Enter the backend REST API & WebSocket endpoint URL:")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = tempUrl,
                        onValueChange = { tempUrl = it },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.updateServerUrl(tempUrl)
                        showServerDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = WhatsAppGreenDark)
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showServerDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun SessionSettingsScreen(
    viewModel: ProfileViewModel,
    onNavigateBack: () -> Unit
) {
    var showUnlinkDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Session Settings",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Session Isolation & Security",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Each user account maintains an isolated Baileys socket and encrypted authentication state on the backend server. Your credentials and session tokens are strictly scoped to your authenticated account.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Session Actions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    OutlinedButton(
                        onClick = { showUnlinkDialog = true },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = ErrorRed),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.DeleteForever, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Unlink & Clear Baileys Auth State")
                    }
                }
            }
        }
    }

    if (showUnlinkDialog) {
        ConfirmDialog(
            title = "Unlink WhatsApp Session?",
            message = "This will wipe all active authentication files on the server. You will need to scan the QR code again.",
            confirmText = "Unlink",
            isDestructive = true,
            onConfirm = {
                viewModel.unlinkWhatsApp {
                    showUnlinkDialog = false
                    onNavigateBack()
                }
            },
            onDismiss = { showUnlinkDialog = false }
        )
    }
}
