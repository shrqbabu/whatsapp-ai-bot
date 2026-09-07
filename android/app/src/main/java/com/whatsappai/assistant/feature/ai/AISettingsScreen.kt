package com.whatsappai.assistant.feature.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import com.whatsappai.assistant.core.theme.WhatsAppGreenDark
import com.whatsappai.assistant.core.theme.WhatsAppGreenPrimary
import com.whatsappai.assistant.core.ui.components.AppTopBar
import com.whatsappai.assistant.core.ui.components.ErrorBanner
import com.whatsappai.assistant.core.ui.components.LoadingView
import com.whatsappai.assistant.data.model.AISettingsDto
import com.whatsappai.assistant.data.model.UpdateAISettingsRequest
import com.whatsappai.assistant.data.repository.AIRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AISettingsUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val settings: AISettingsDto? = null,
    val saveSuccess: Boolean = false,
    val errorMessage: String? = null
)

class AISettingsViewModel(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AISettingsUiState(isLoading = true))
    val uiState: StateFlow<AISettingsUiState> = _uiState.asStateFlow()

    var enabled by mutableStateOf(true)
    var systemPrompt by mutableStateOf("")
    var selectedModel by mutableStateOf("gpt-4o-mini")
    var replyDelay by mutableStateOf(3)
    var debounceDelay by mutableStateOf(2)
    var groupsEnabled by mutableStateOf(false)
    var replyOnlyWhenMentioned by mutableStateOf(false)
    var businessHoursEnabled by mutableStateOf(false)

    val availableModels = listOf("gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet", "gemini-1.5-flash")
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

    fun saveSettings() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, errorMessage = null, saveSuccess = false)
            val request = UpdateAISettingsRequest(
                enabled = enabled,
                systemPrompt = systemPrompt.trim(),
                model = selectedModel,
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
    var modelMenuExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.saveSuccess) {
        if (uiState.saveSuccess) {
            snackbarHostState.showSnackbar("AI Settings saved successfully!")
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            AppTopBar(
                title = "AI Prompt & Settings",
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
                                text = "Enable or disable automatic AI replies for all incoming messages",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = viewModel.enabled,
                            onCheckedChange = { viewModel.enabled = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = WhatsAppGreenDark)
                        )
                    }
                }

                // System Prompt Card
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
                            text = "Custom System Prompt",
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
                            placeholder = { Text("You are a helpful customer support assistant...") }
                        )

                        // Sample prompt template button
                        OutlinedButton(
                            onClick = {
                                viewModel.systemPrompt = "You are a friendly and professional customer support assistant. Reply politely and concisely. Use Hindi/Hinglish when the customer writes in Hindi. Do not invent prices or fake policies."
                            },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.align(Alignment.End)
                        ) {
                            Text("Use Recommended Template", fontSize = 12.sp)
                        }
                    }
                }

                // Model & Provider Selection
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
                            text = "AI Model",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        ExposedDropdownMenuBox(
                            expanded = modelMenuExpanded,
                            onExpandedChange = { modelMenuExpanded = it }
                        ) {
                            OutlinedTextField(
                                value = viewModel.selectedModel,
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = modelMenuExpanded) },
                                modifier = Modifier
                                    .menuAnchor()
                                    .fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )
                            ExposedDropdownMenu(
                                expanded = modelMenuExpanded,
                                onDismissRequest = { modelMenuExpanded = false }
                            ) {
                                viewModel.availableModels.forEach { model ->
                                    DropdownMenuItem(
                                        text = { Text(model) },
                                        onClick = {
                                            viewModel.selectedModel = model
                                            modelMenuExpanded = false
                                        }
                                    )
                                }
                            }
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
                            text = "Reply Delay",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Add a natural human-like delay before the bot sends its response.",
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

                // Debounce Window Card
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
                            text = "Message Burst Debounce (${viewModel.debounceDelay}s)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Combines consecutive customer messages into a single response.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Slider(
                            value = viewModel.debounceDelay.toFloat(),
                            onValueChange = { viewModel.debounceDelay = it.toInt() },
                            valueRange = 0f..10f,
                            steps = 9,
                            colors = SliderDefaults.colors(
                                thumbColor = WhatsAppGreenDark,
                                activeTrackColor = WhatsAppGreenDark
                            )
                        )
                    }
                }

                // Save Changes Button
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
                        Text("Save AI Settings", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
