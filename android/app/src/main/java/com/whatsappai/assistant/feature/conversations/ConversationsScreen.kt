package com.whatsappai.assistant.feature.conversations

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.whatsappai.assistant.core.network.NetworkResult
import com.whatsappai.assistant.core.network.WebSocketManager
import com.whatsappai.assistant.core.network.WsEvent
import com.whatsappai.assistant.core.theme.*
import com.whatsappai.assistant.core.ui.components.*
import com.whatsappai.assistant.data.model.ConversationDTO
import com.whatsappai.assistant.data.model.MessageDTO
import com.whatsappai.assistant.data.repository.ConversationsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class ConversationsListUiState {
    object Loading : ConversationsListUiState()
    data class Success(val conversations: List<ConversationDTO>) : ConversationsListUiState()
    data class Error(val message: String) : ConversationsListUiState()
}

sealed class ChatDetailUiState {
    object Loading : ChatDetailUiState()
    data class Success(
        val conversation: ConversationDTO,
        val messages: List<MessageDTO>,
        val isTakeoverActive: Boolean
    ) : ChatDetailUiState()
    data class Error(val message: String) : ChatDetailUiState()
}

class ConversationsViewModel(
    private val repository: ConversationsRepository,
    private val webSocketManager: WebSocketManager
) : ViewModel() {

    private val _listState = MutableStateFlow<ConversationsListUiState>(ConversationsListUiState.Loading)
    val listState: StateFlow<ConversationsListUiState> = _listState.asStateFlow()

    private val _chatState = MutableStateFlow<ChatDetailUiState>(ChatDetailUiState.Loading)
    val chatState: StateFlow<ChatDetailUiState> = _chatState.asStateFlow()

    var searchQuery by mutableStateOf("")
    var messageInput by mutableStateOf("")
    var isSendingMessage by mutableStateOf(false)

    private var activeConversationId: String? = null

    init {
        loadConversations()
        observeWebSocket()
    }

    fun loadConversations() {
        viewModelScope.launch {
            _listState.value = ConversationsListUiState.Loading
            when (val result = repository.listConversations(search = searchQuery.ifBlank { null })) {
                is NetworkResult.Success -> _listState.value = ConversationsListUiState.Success(result.data)
                is NetworkResult.Error -> _listState.value = ConversationsListUiState.Error(result.message)
                else -> {}
            }
        }
    }

    fun openChat(conversationId: String) {
        activeConversationId = conversationId
        loadChatMessages(conversationId)
    }

    fun loadChatMessages(conversationId: String) {
        viewModelScope.launch {
            _chatState.value = ChatDetailUiState.Loading
            // Get conversation details & messages
            val listRes = repository.listConversations()
            val conv = (listRes as? NetworkResult.Success)?.data?.find { it.id == conversationId }

            when (val msgRes = repository.getMessages(conversationId)) {
                is NetworkResult.Success -> {
                    if (conv != null) {
                        _chatState.value = ChatDetailUiState.Success(
                            conversation = conv,
                            messages = msgRes.data,
                            isTakeoverActive = conv.takeoverActive
                        )
                    } else {
                        _chatState.value = ChatDetailUiState.Error("Conversation not found")
                    }
                }
                is NetworkResult.Error -> {
                    _chatState.value = ChatDetailUiState.Error(msgRes.message)
                }
                else -> {}
            }
        }
    }

    fun toggleTakeover(conversationId: String, durationMinutes: Int? = null) {
        viewModelScope.launch {
            val currentState = _chatState.value
            if (currentState is ChatDetailUiState.Success) {
                if (currentState.isTakeoverActive) {
                    // Resume AI
                    when (val res = repository.resumeAi(conversationId)) {
                        is NetworkResult.Success -> {
                            _chatState.value = currentState.copy(
                                conversation = res.data,
                                isTakeoverActive = false
                            )
                        }
                        else -> {}
                    }
                } else {
                    // Enable Takeover
                    when (val res = repository.takeover(conversationId, durationMinutes)) {
                        is NetworkResult.Success -> {
                            _chatState.value = currentState.copy(
                                conversation = res.data,
                                isTakeoverActive = true
                            )
                        }
                        else -> {}
                    }
                }
            }
        }
    }

    fun sendManualMessage(conversationId: String) {
        val text = messageInput.trim()
        if (text.isBlank()) return

        viewModelScope.launch {
            isSendingMessage = true
            when (val result = repository.sendMessage(conversationId, text)) {
                is NetworkResult.Success -> {
                    messageInput = ""
                    isSendingMessage = false
                    val currentState = _chatState.value
                    if (currentState is ChatDetailUiState.Success) {
                        _chatState.value = currentState.copy(
                            messages = currentState.messages + result.data
                        )
                    }
                }
                is NetworkResult.Error -> {
                    isSendingMessage = false
                }
                else -> {
                    isSendingMessage = false
                }
            }
        }
    }

    private fun observeWebSocket() {
        viewModelScope.launch {
            webSocketManager.events.collect { event ->
                when (event) {
                    is WsEvent.MessageReceived, is WsEvent.MessageSent, is WsEvent.AiReplied -> {
                        // Refresh conversations list
                        val listRes = repository.listConversations(search = searchQuery.ifBlank { null })
                        if (listRes is NetworkResult.Success) {
                            _listState.value = ConversationsListUiState.Success(listRes.data)
                        }

                        // If currently on active chat screen, refresh messages
                        activeConversationId?.let { convId ->
                            val msgRes = repository.getMessages(convId)
                            if (msgRes is NetworkResult.Success) {
                                val current = _chatState.value
                                if (current is ChatDetailUiState.Success) {
                                    _chatState.value = current.copy(messages = msgRes.data)
                                }
                            }
                        }
                    }
                    is WsEvent.TakeoverChanged -> {
                        if (event.conversationId == activeConversationId) {
                            val current = _chatState.value
                            if (current is ChatDetailUiState.Success) {
                                _chatState.value = current.copy(isTakeoverActive = event.active)
                            }
                        }
                    }
                    else -> {}
                }
            }
        }
    }
}

@Composable
fun ConversationsListScreen(
    viewModel: ConversationsViewModel,
    onNavigateToChat: (String) -> Unit,
    onNavigateBack: () -> Unit
) {
    val listState by viewModel.listState.collectAsState()

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Conversations",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.loadConversations() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = viewModel.searchQuery,
                onValueChange = {
                    viewModel.searchQuery = it
                    viewModel.loadConversations()
                },
                placeholder = { Text("Search chats...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            when (val state = listState) {
                is ConversationsListUiState.Loading -> LoadingView("Loading conversations...")
                is ConversationsListUiState.Error -> ErrorBanner(message = state.message, onRetry = { viewModel.loadConversations() })
                is ConversationsListUiState.Success -> {
                    if (state.conversations.isEmpty()) {
                        EmptyStateView(
                            icon = Icons.Default.Forum,
                            title = "No Conversations Yet",
                            subtitle = "When people message your WhatsApp account, their conversations will appear here in real-time."
                        )
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(state.conversations, key = { it.id }) { conv ->
                                ConversationItemCard(
                                    conversation = conv,
                                    onClick = { onNavigateToChat(conv.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ConversationItemCard(
    conversation: ConversationDTO,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = if (conversation.isGroup) Color(0xFF0D9488).copy(alpha = 0.15f) else WhatsAppGreenPrimary.copy(alpha = 0.15f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = if (conversation.isGroup) Icons.Default.Groups else Icons.Default.Person,
                        contentDescription = null,
                        tint = if (conversation.isGroup) Color(0xFF0D9488) else WhatsAppGreenDark,
                        modifier = Modifier.size(26.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = conversation.chatName ?: conversation.chatJid.split("@")[0],
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )

                    if (conversation.takeoverActive) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = TakeoverAmber.copy(alpha = 0.15f),
                            modifier = Modifier.padding(start = 6.dp)
                        ) {
                            Text(
                                text = "TAKEOVER",
                                color = TakeoverAmber,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = conversation.lastMessagePreview ?: "No messages",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun ChatDetailScreen(
    conversationId: String,
    viewModel: ConversationsViewModel,
    onNavigateBack: () -> Unit
) {
    val chatState by viewModel.chatState.collectAsState()
    val listState = rememberLazyListState()

    LaunchedEffect(conversationId) {
        viewModel.openChat(conversationId)
    }

    Scaffold(
        topBar = {
            val title = when (val s = chatState) {
                is ChatDetailUiState.Success -> s.conversation.chatName ?: s.conversation.chatJid.split("@")[0]
                else -> "Chat"
            }
            AppTopBar(
                title = title,
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.loadChatMessages(conversationId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (val state = chatState) {
                is ChatDetailUiState.Loading -> LoadingView("Loading messages...")
                is ChatDetailUiState.Error -> ErrorBanner(message = state.message, onRetry = { viewModel.loadChatMessages(conversationId) })
                is ChatDetailUiState.Success -> {
                    // Top Takeover Banner
                    TakeoverBanner(
                        isTakeoverActive = state.isTakeoverActive,
                        onTakeoverClick = { viewModel.toggleTakeover(conversationId, durationMinutes = 60) },
                        onResumeClick = { viewModel.toggleTakeover(conversationId) },
                        modifier = Modifier.padding(12.dp)
                    )

                    // Message Stream
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(state.messages, key = { it.id }) { msg ->
                            MessageBubble(message = msg)
                        }
                    }

                    // Bottom Composer
                    Surface(
                        shadowElevation = 8.dp,
                        color = MaterialTheme.colorScheme.surface
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = viewModel.messageInput,
                                onValueChange = { viewModel.messageInput = it },
                                placeholder = { Text("Send manual message...") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(24.dp),
                                maxLines = 4
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            IconButton(
                                onClick = { viewModel.sendManualMessage(conversationId) },
                                enabled = viewModel.messageInput.isNotBlank() && !viewModel.isSendingMessage,
                                colors = IconButtonDefaults.iconButtonColors(
                                    containerColor = WhatsAppGreenDark,
                                    contentColor = Color.White
                                )
                            ) {
                                if (viewModel.isSendingMessage) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                                } else {
                                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MessageBubble(message: MessageDTO) {
    val isOutbound = message.isFromMe || message.direction.uppercase() == "OUTGOING"

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isOutbound) Alignment.End else Alignment.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isOutbound) 16.dp else 4.dp,
                bottomEnd = if (isOutbound) 4.dp else 16.dp
            ),
            color = if (isOutbound) Color(0xFFDCF8C6) else Color.White,
            shadowElevation = 1.dp,
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                if (message.aiGenerated) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(bottom = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = AiPurple,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "AI Auto-Reply",
                            color = AiPurple,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Text(
                    text = message.text ?: "[Media]",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF111B21)
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = (message.createdAt ?: "").substringAfter("T").substringBefore(".").take(5),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                    modifier = Modifier.align(Alignment.End)
                )
            }
        }
    }
}
