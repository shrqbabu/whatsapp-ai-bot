package com.whatsappai.assistant.feature.ai

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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.whatsappai.assistant.core.network.NetworkResult
import com.whatsappai.assistant.core.theme.AiPurple
import com.whatsappai.assistant.core.theme.WhatsAppGreenDark
import com.whatsappai.assistant.core.theme.WhatsAppGreenPrimary
import com.whatsappai.assistant.core.ui.components.AppTopBar
import com.whatsappai.assistant.core.ui.components.ErrorBanner
import com.whatsappai.assistant.core.ui.components.LoadingView
import com.whatsappai.assistant.core.ui.components.appSwitchColors
import com.whatsappai.assistant.data.model.AISettingsDTO
import com.whatsappai.assistant.data.model.UpdateAISettingsRequest
import com.whatsappai.assistant.data.repository.AIRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AISettingsUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val settings: AISettingsDTO? = null,
    val saveSuccess: Boolean = false,
    val errorMessage: String? = null
)

data class ProviderPreset(
    val name: String,
    val baseUrl: String,
    val defaultModel: String
)

class AISettingsViewModel(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AISettingsUiState(isLoading = true))
    val uiState: StateFlow<AISettingsUiState> = _uiState.asStateFlow()

    var enabled by mutableStateOf(true)
    var systemPrompt by mutableStateOf("")
    var selectedModel by mutableStateOf("gpt-4o-mini")
    var apiBaseUrl by mutableStateOf("https://api.openai.com/v1")
    var apiKey by mutableStateOf("")
    var replyDelay by mutableStateOf(3)
    var debounceDelay by mutableStateOf(2)
    var groupsEnabled by mutableStateOf(false)
    var replyOnlyWhenMentioned by mutableStateOf(false)
    var businessHoursEnabled by mutableStateOf(false)

    val presets = listOf(
        ProviderPreset("OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"),
        ProviderPreset("OpenRouter", "https://openrouter.ai/api/v1", "meta-llama/llama-3.3-70b-instruct"),
        ProviderPreset("Groq", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
        ProviderPreset("DeepSeek", "https://api.deepseek.com/v1", "deepseek-chat"),
        ProviderPreset("Ollama (Local)", "http://localhost:11434/v1", "llama3.2")
    )

    val delayOptions = listOf(0, 1, 3, 5, 10)

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            when (val result = aiRepository.getSettings()) {
                is NetworkResult.Success -> {
                    val s = result.data
                    enabled = s.enabled
                    systemPrompt = s.systemPrompt
                    selectedModel = s.model
                    apiBaseUrl = s.apiBaseUrl ?: "https://api.openai.com/v1"
                    apiKey = s.apiKey ?: ""
                    replyDelay = s.replyDelay
                    debounceDelay = s.debounceDelay
                    groupsEnabled = s.groupsEnabled
                    replyOnlyWhenMentioned = s.replyOnlyWhenMentioned
                    businessHoursEnabled = s.businessHoursEnabled

                    _uiState.value = AISettingsUiState(
                        isLoading = false,
                        settings = s
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = AISettingsUiState(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                else -> {}
            }
        }
    }

    fun applyPreset(preset: ProviderPreset) {
        apiBaseUrl = preset.baseUrl
        selectedModel = preset.defaultModel
    }

    fun saveSettings() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, errorMessage = null, saveSuccess = false)
            val request = UpdateAISettingsRequest(
                enabled = enabled,
                systemPrompt = systemPrompt.trim(),
                model = selectedModel.trim(),
                apiBaseUrl = apiBaseUrl.trim().ifBlank { null },
                apiKey = apiKey.trim().ifBlank { null },
                replyDelay = replyDelay,
                debounceDelay = debounceDelay,
                groupsEnabled = groupsEnabled,
                replyOnlyWhenMentioned = replyOnlyWhenMentioned,
                businessHoursEnabled = businessHoursEnabled
            )

            when (val result = aiRepository.updateSettings(request)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        settings = result.data,
                        saveSuccess = true
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        errorMessage = result.message
                    )
                }
                else -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AISettingsScreen(
    viewModel: AISettingsViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var apiKeyVisible by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.saveSuccess) {
        if (uiState.saveSuccess) {
            snackbarHostState.showSnackbar("OpenAI-compatible AI settings saved successfully!")
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            AppTopBar(
                title = "AI Model & Provider",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(
                        onClick = { viewModel.saveSettings() },
                        enabled = !uiState.isSaving && !uiState.isLoading
                    ) {
                        Icon(Icons.Default.Save, contentDescription = "Save")
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            LoadingView("Loading AI settings...")
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (uiState.errorMessage != null) {
                    ErrorBanner(
                        message = uiState.errorMessage!!,
                        onRetry = { viewModel.loadSettings() }
                    )
                }

                // Global AI Switch Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "AI Auto-Reply Master Switch",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Enable or disable automated replies across WhatsApp chats",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = viewModel.enabled,
                            onCheckedChange = { viewModel.enabled = it },
                            colors = appSwitchColors()
                        )
                    }
                }

                // Provider Presets Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "OpenAI-Compatible Providers",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Quickly select any third-party provider or custom OpenAI gateway:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            viewModel.presets.take(3).forEach { preset ->
                                val isSelected = viewModel.apiBaseUrl == preset.baseUrl
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { viewModel.applyPreset(preset) },
                                    label = { Text(preset.name, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = WhatsAppGreenDark,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            viewModel.presets.drop(3).forEach { preset ->
                                val isSelected = viewModel.apiBaseUrl == preset.baseUrl
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { viewModel.applyPreset(preset) },
                                    label = { Text(preset.name, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = WhatsAppGreenDark,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }
                    }
                }

                // API Endpoint & Key Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "Endpoint & Authentication",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        OutlinedTextField(
                            value = viewModel.apiBaseUrl,
                            onValueChange = { viewModel.apiBaseUrl = it },
                            label = { Text("API Base URL") },
                            placeholder = { Text("https://openrouter.ai/api/v1") },
                            leadingIcon = { Icon(Icons.Default.Dns, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )

                        OutlinedTextField(
                            value = viewModel.selectedModel,
                            onValueChange = { viewModel.selectedModel = it },
                            label = { Text("Model Name") },
                            placeholder = { Text("deepseek-chat, llama-3.3-70b, gpt-4o-mini...") },
                            leadingIcon = { Icon(Icons.Default.SmartToy, contentDescription = null, tint = AiPurple) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )

                        OutlinedTextField(
                            value = viewModel.apiKey,
                            onValueChange = { viewModel.apiKey = it },
                            label = { Text("Provider API Key (Optional per session)") },
                            placeholder = { Text("Leave blank to use server .env default") },
                            leadingIcon = { Icon(Icons.Default.Key, contentDescription = null) },
                            trailingIcon = {
                                IconButton(onClick = { apiKeyVisible = !apiKeyVisible }) {
                                    Icon(
                                        imageVector = if (apiKeyVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                        contentDescription = null
                                    )
                                }
                            },
                            visualTransformation = if (apiKeyVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }

                // Custom System Prompt Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "System Prompt & Instructions",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Instruct the AI on persona, tone, language (e.g. Hindi/Hinglish), and business guidelines.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        OutlinedTextField(
                            value = viewModel.systemPrompt,
                            onValueChange = { viewModel.systemPrompt = it },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp),
                            shape = RoundedCornerShape(12.dp),
                            placeholder = { Text("You are a friendly and professional customer support assistant...") }
                        )

                        OutlinedButton(
                            onClick = {
                                viewModel.systemPrompt = "You are a friendly and professional customer support assistant. Reply politely and concisely. Use Hindi/Hinglish when the customer writes in Hindi. Do not invent prices or fake policies."
                            },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.align(Alignment.End)
                        ) {
                            Text("Use Hindi/Hinglish Support Template", fontSize = 12.sp)
                        }
                    }
                }

                // Reply Delay Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Reply Delay (${viewModel.replyDelay}s)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Simulates human typing delay before sending the message:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            viewModel.delayOptions.forEach { delay ->
                                FilterChip(
                                    selected = viewModel.replyDelay == delay,
                                    onClick = { viewModel.replyDelay = delay },
                                    label = { Text("${delay}s", fontWeight = FontWeight.Bold) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = WhatsAppGreenDark,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }
                    }
                }

                // Save Button
                Button(
                    onClick = { viewModel.saveSettings() },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = WhatsAppGreenDark),
                    enabled = !uiState.isSaving,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    if (uiState.isSaving) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    } else {
                        Icon(Icons.Default.Save, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Save Settings", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
