package com.whatsappai.assistant.feature.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.whatsappai.assistant.core.network.NetworkResult
import com.whatsappai.assistant.core.storage.TokenManager
import com.whatsappai.assistant.core.theme.WhatsAppGreenPrimary
import com.whatsappai.assistant.core.ui.components.ErrorBanner
import com.whatsappai.assistant.data.model.LoginRequest
import com.whatsappai.assistant.data.model.RegisterRequest
import com.whatsappai.assistant.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val errorMessage: String? = null
)

class AuthViewModel(
    private val authRepository: AuthRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun login(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _uiState.value = AuthUiState(errorMessage = "Email and password are required")
            return
        }

        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true)
            val request = LoginRequest(email = email.trim(), password = pass)
            when (val result = authRepository.login(request)) {
                is NetworkResult.Success -> {
                    _uiState.value = AuthUiState(isSuccess = true)
                }
                is NetworkResult.Error -> {
                    _uiState.value = AuthUiState(errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    fun register(email: String, pass: String, fullName: String) {
        if (email.isBlank() || pass.isBlank() || fullName.isBlank()) {
            _uiState.value = AuthUiState(errorMessage = "All fields are required")
            return
        }

        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true)
            val request = RegisterRequest(email = email.trim(), password = pass, fullName = fullName.trim())
            when (val result = authRepository.register(request)) {
                is NetworkResult.Success -> {
                    _uiState.value = AuthUiState(isSuccess = true)
                }
                is NetworkResult.Error -> {
                    _uiState.value = AuthUiState(errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    fun getServerUrl(): String = tokenManager.getServerUrl()
    fun setServerUrl(url: String) = tokenManager.setServerUrl(url)
}

@Composable
fun AuthScreen(
    viewModel: AuthViewModel,
    onAuthSuccess: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var isRegisterMode by remember { mutableStateOf(false) }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    var showServerDialog by remember { mutableStateOf(false) }
    var currentServerUrl by remember { mutableStateOf(viewModel.getServerUrl()) }
    var tempServerUrl by remember { mutableStateOf(viewModel.getServerUrl()) }

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onAuthSuccess()
        }
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // App Logo Icon
            Surface(
                modifier = Modifier.size(72.dp),
                shape = RoundedCornerShape(20.dp),
                color = WhatsAppGreenPrimary
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.SmartToy,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "WhatsApp AI Auto-Reply",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )

            Text(
                text = if (isRegisterMode) "Create your multi-tenant account" else "Sign in to control your WhatsApp AI agent",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Tab Selector
            TabRow(
                selectedTabIndex = if (isRegisterMode) 1 else 0,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = WhatsAppGreenPrimary,
                modifier = Modifier.fillMaxWidth()
            ) {
                Tab(
                    selected = !isRegisterMode,
                    onClick = { isRegisterMode = false },
                    text = { Text("Sign In", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = isRegisterMode,
                    onClick = { isRegisterMode = true },
                    text = { Text("Register", fontWeight = FontWeight.Bold) }
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Error Banner
            if (uiState.errorMessage != null) {
                ErrorBanner(message = uiState.errorMessage!!)
                Spacer(modifier = Modifier.height(14.dp))
            }

            // Form Fields
            if (isRegisterMode) {
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Full Name") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email Address") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    if (isRegisterMode) {
                        viewModel.register(email, password, fullName)
                    } else {
                        viewModel.login(email, password)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = WhatsAppGreenPrimary),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Text(
                        text = if (isRegisterMode) "Create Account" else "Sign In",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Server URL configuration button
            TextButton(onClick = {
                tempServerUrl = viewModel.getServerUrl()
                showServerDialog = true
            }) {
                Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Backend Server: $currentServerUrl", fontSize = 12.sp)
            }
        }
    }

    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = { Text("Backend Server URL") },
            text = {
                Column {
                    Text("Enter your backend server base URL (e.g. http://10.0.2.2:4000 for emulator or your server IP):")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = tempServerUrl,
                        onValueChange = { tempServerUrl = it },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    var cleanUrl = tempServerUrl.trim()
                    if (cleanUrl.isNotEmpty()) {
                        if (!cleanUrl.startsWith("http://", ignoreCase = true) && !cleanUrl.startsWith("https://", ignoreCase = true)) {
                            cleanUrl = "https://$cleanUrl"
                        }
                        viewModel.setServerUrl(cleanUrl)
                        currentServerUrl = cleanUrl
                    }
                    showServerDialog = false
                }) {
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
