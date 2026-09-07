package com.whatsappai.assistant.feature.groups

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
import com.whatsappai.assistant.core.theme.AiBlue
import com.whatsappai.assistant.core.theme.WhatsAppGreenDark
import com.whatsappai.assistant.core.theme.WhatsAppGreenPrimary
import com.whatsappai.assistant.core.ui.components.AppTopBar
import com.whatsappai.assistant.core.ui.components.ErrorBanner
import com.whatsappai.assistant.core.ui.components.LoadingView
import com.whatsappai.assistant.data.model.UpdateAISettingsRequest
import com.whatsappai.assistant.data.repository.AIRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class GroupRulesUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val groupsEnabled: Boolean = false,
    val replyOnlyWhenMentioned: Boolean = true,
    val saveSuccess: Boolean = false,
    val errorMessage: String? = null
)

class GroupRulesViewModel(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(GroupRulesUiState(isLoading = true))
    val uiState: StateFlow<GroupRulesUiState> = _uiState.asStateFlow()

    init {
        loadRules()
    }

    fun loadRules() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            when (val result = aiRepository.getSettings()) {
                is NetworkResult.Success -> {
                    _uiState.value = GroupRulesUiState(
                        isLoading = false,
                        groupsEnabled = result.data.groupsEnabled,
                        replyOnlyWhenMentioned = result.data.replyOnlyWhenMentioned
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = GroupRulesUiState(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                else -> {}
            }
        }
    }

    fun saveRules(groupsEnabled: Boolean, replyOnlyWhenMentioned: Boolean) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, saveSuccess = false, errorMessage = null)
            val request = UpdateAISettingsRequest(
                groupsEnabled = groupsEnabled,
                replyOnlyWhenMentioned = replyOnlyWhenMentioned
            )
            when (val result = aiRepository.updateSettings(request)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        groupsEnabled = result.data.groupsEnabled,
                        replyOnlyWhenMentioned = result.data.replyOnlyWhenMentioned,
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

@Composable
fun GroupRulesScreen(
    viewModel: GroupRulesViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var groupsEnabled by remember(uiState.groupsEnabled) { mutableStateOf(uiState.groupsEnabled) }
    var replyOnlyWhenMentioned by remember(uiState.replyOnlyWhenMentioned) { mutableStateOf(uiState.replyOnlyWhenMentioned) }

    LaunchedEffect(uiState.saveSuccess) {
        if (uiState.saveSuccess) {
            snackbarHostState.showSnackbar("Group rules saved successfully!")
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            AppTopBar(
                title = "Group Auto-Reply Rules",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            LoadingView("Loading group rules...")
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
                        onRetry = { viewModel.loadRules() }
                    )
                }

                // Global Group Switch Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Groups Auto-Reply",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Allow AI to automatically answer messages in WhatsApp groups",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Switch(
                                checked = groupsEnabled,
                                onCheckedChange = { groupsEnabled = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = WhatsAppGreenDark)
                            )
                        }
                    }
                }

                // Mention Only Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Reply Only When Mentioned",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "The AI will stay silent unless someone explicitly mentions your WhatsApp number (@you)",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Switch(
                                checked = replyOnlyWhenMentioned,
                                onCheckedChange = { replyOnlyWhenMentioned = it },
                                enabled = groupsEnabled,
                                colors = SwitchDefaults.colors(checkedThumbColor = AiBlue)
                            )
                        }
                    }
                }

                // Safety Info Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = WhatsAppGreenDark)
                        Text(
                            text = "Keeping 'Reply Only When Mentioned' active prevents spamming group chats with unsolicited auto-replies.",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = { viewModel.saveRules(groupsEnabled, replyOnlyWhenMentioned) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = WhatsAppGreenDark),
                    enabled = !uiState.isSaving
                ) {
                    if (uiState.isSaving) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    } else {
                        Icon(Icons.Default.Save, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Save Group Rules", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
