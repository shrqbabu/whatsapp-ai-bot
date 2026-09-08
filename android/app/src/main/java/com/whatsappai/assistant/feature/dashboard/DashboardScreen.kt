package com.whatsappai.assistant.feature.dashboard

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
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.whatsappai.assistant.core.network.NetworkResult
import com.whatsappai.assistant.core.network.WebSocketManager
import com.whatsappai.assistant.core.network.WsEvent
import com.whatsappai.assistant.core.theme.*
import com.whatsappai.assistant.core.ui.components.AppTopBar
import com.whatsappai.assistant.core.ui.components.ErrorBanner
import com.whatsappai.assistant.core.ui.components.MetricCard
import com.whatsappai.assistant.core.ui.components.StatusBadge
import com.whatsappai.assistant.data.model.DashboardStatsDTO
import com.whatsappai.assistant.data.repository.DashboardRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val isLoading: Boolean = false,
    val stats: DashboardStatsDTO = DashboardStatsDTO(
        whatsappStatus = "DISCONNECTED",
        aiEnabled = true,
        todayMessages = 0,
        todayAiReplies = 0,
        activeConversations = 0,
        pendingTakeover = 0,
        phoneNumber = null
    ),
    val errorMessage: String? = null
)

class DashboardViewModel(
    private val dashboardRepository: DashboardRepository,
    private val webSocketManager: WebSocketManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState(isLoading = true))
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadStats()
        observeWebSocketEvents()
    }

    fun loadStats() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            when (val result = dashboardRepository.getStats()) {
                is NetworkResult.Success -> {
                    _uiState.value = DashboardUiState(isLoading = false, stats = result.data)
                }
                is NetworkResult.Error -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    private fun observeWebSocketEvents() {
        viewModelScope.launch {
            webSocketManager.events.collect { event ->
                when (event) {
                    is WsEvent.StatusUpdate -> {
                        _uiState.value = _uiState.value.copy(
                            stats = _uiState.value.stats.copy(
                                whatsappStatus = event.status,
                                phoneNumber = event.phoneNumber ?: _uiState.value.stats.phoneNumber
                            )
                        )
                    }
                    is WsEvent.Connected -> {
                        _uiState.value = _uiState.value.copy(
                            stats = _uiState.value.stats.copy(
                                whatsappStatus = "CONNECTED",
                                phoneNumber = event.phoneNumber
                            )
                        )
                    }
                    is WsEvent.Disconnected -> {
                        _uiState.value = _uiState.value.copy(
                            stats = _uiState.value.stats.copy(whatsappStatus = "DISCONNECTED")
                        )
                    }
                    is WsEvent.MessageReceived -> {
                        _uiState.value = _uiState.value.copy(
                            stats = _uiState.value.stats.copy(
                                todayMessages = _uiState.value.stats.todayMessages + 1
                            )
                        )
                    }
                    is WsEvent.AiReplied -> {
                        _uiState.value = _uiState.value.copy(
                            stats = _uiState.value.stats.copy(
                                todayAiReplies = _uiState.value.stats.todayAiReplies + 1
                            )
                        )
                    }
                    else -> {}
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onNavigateToWhatsApp: () -> Unit,
    onNavigateToAI: () -> Unit,
    onNavigateToConversations: () -> Unit,
    onNavigateToContacts: () -> Unit,
    onNavigateToGroups: () -> Unit,
    onNavigateToBusinessHours: () -> Unit,
    onNavigateToProfile: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadStats()
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "WhatsApp AI Agent",
                actions = {
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.AccountCircle, contentDescription = "Profile")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (uiState.errorMessage != null) {
                ErrorBanner(
                    message = uiState.errorMessage!!,
                    onRetry = { viewModel.loadStats() }
                )
            }

            // WhatsApp Connection Status Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToWhatsApp() },
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
                    Column {
                        Text(
                            text = "WhatsApp Connection",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        if (!uiState.stats.phoneNumber.isNullOrBlank()) {
                            Text(
                                text = "+${uiState.stats.phoneNumber}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                        } else {
                            Text(
                                text = "Tap to link WhatsApp Web",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                            )
                        }
                    }
                    StatusBadge(status = uiState.stats.whatsappStatus)
                }
            }

            // AI Status Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToAI() },
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
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = AiPurple.copy(alpha = 0.15f),
                            modifier = Modifier.size(40.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.SmartToy, contentDescription = null, tint = AiPurple)
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "AI Auto-Reply",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = if (uiState.stats.aiEnabled) "Active & generating replies" else "Disabled",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (uiState.stats.aiEnabled) WhatsAppGreenPrimary else Color.Gray
                            )
                        }
                    }
                    Switch(
                        checked = uiState.stats.aiEnabled,
                        onCheckedChange = { onNavigateToAI() },
                        colors = appSwitchColors()
                    )
                }
            }

            // Metrics Grid (2x2)
            Text(
                text = "Today's Overview",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = "Today's Msgs",
                    value = uiState.stats.todayMessages.toString(),
                    icon = Icons.Default.Chat,
                    iconTint = WhatsAppGreenPrimary,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToConversations
                )
                MetricCard(
                    title = "AI Replies",
                    value = uiState.stats.todayAiReplies.toString(),
                    icon = Icons.Default.AutoAwesome,
                    iconTint = AiPurple,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToAI
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(
                    title = "Active Chats",
                    value = uiState.stats.activeConversations.toString(),
                    icon = Icons.Default.Forum,
                    iconTint = AiBlue,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToConversations
                )
                MetricCard(
                    title = "Takeovers",
                    value = uiState.stats.pendingTakeover.toString(),
                    icon = Icons.Default.Person,
                    iconTint = TakeoverAmber,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToConversations
                )
            }

            // Quick Control Shortcuts
            Text(
                text = "Automation Controls",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )

            DashboardActionTile(
                title = "AI Prompt & Model Settings",
                subtitle = "Configure prompt, reply delay & LLM provider",
                icon = Icons.Default.Psychology,
                accentColor = AiPurple,
                onClick = onNavigateToAI
            )

            DashboardActionTile(
                title = "Contact Rules & Blocklist",
                subtitle = "Manage individual contact AI toggles",
                icon = Icons.Default.Contacts,
                accentColor = WhatsAppGreenPrimary,
                onClick = onNavigateToContacts
            )

            DashboardActionTile(
                title = "Group Auto-Reply Rules",
                subtitle = "Enable groups and mention requirements",
                icon = Icons.Default.Groups,
                accentColor = AiBlue,
                onClick = onNavigateToGroups
            )

            DashboardActionTile(
                title = "Business Hours & Schedule",
                subtitle = "Configure operating hours and away messages",
                icon = Icons.Default.Schedule,
                accentColor = TakeoverAmber,
                onClick = onNavigateToBusinessHours
            )

            DashboardActionTile(
                title = "Conversations & Manual Takeover",
                subtitle = "View chat history and take over live conversations",
                icon = Icons.Default.MarkChatUnread,
                accentColor = WhatsAppGreenDark,
                onClick = onNavigateToConversations
            )
        }
    }
}

@Composable
fun DashboardActionTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    accentColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = accentColor.copy(alpha = 0.12f),
                modifier = Modifier.size(42.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(22.dp))
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.Gray)
        }
    }
}
