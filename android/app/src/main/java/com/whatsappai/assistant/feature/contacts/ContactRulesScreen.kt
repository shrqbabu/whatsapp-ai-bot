package com.whatsappai.assistant.feature.contacts

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.whatsappai.assistant.core.theme.*
import com.whatsappai.assistant.core.ui.components.AppTopBar
import com.whatsappai.assistant.core.ui.components.EmptyStateView
import com.whatsappai.assistant.core.ui.components.ErrorBanner
import com.whatsappai.assistant.core.ui.components.LoadingView
import com.whatsappai.assistant.data.model.ContactDTO
import com.whatsappai.assistant.data.model.UpdateContactRuleRequest
import com.whatsappai.assistant.data.repository.ContactsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ContactsUiState(
    val isLoading: Boolean = false,
    val contacts: List<ContactDTO> = emptyList(),
    val errorMessage: String? = null
)

class ContactsViewModel(
    private val contactsRepository: ContactsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ContactsUiState(isLoading = true))
    val uiState: StateFlow<ContactsUiState> = _uiState.asStateFlow()

    var searchQuery by mutableStateOf("")

    init {
        loadContacts()
    }

    fun loadContacts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            when (val result = contactsRepository.listContacts()) {
                is NetworkResult.Success -> {
                    _uiState.value = ContactsUiState(
                        isLoading = false,
                        contacts = result.data
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = ContactsUiState(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                else -> {}
            }
        }
    }

    fun updateRule(contactId: String, aiEnabled: Boolean? = null, blocked: Boolean? = null) {
        viewModelScope.launch {
            // Optimistic local update
            _uiState.value = _uiState.value.copy(
                contacts = _uiState.value.contacts.map {
                    if (it.id == contactId) {
                        it.copy(
                            aiEnabled = aiEnabled ?: it.aiEnabled,
                            blocked = blocked ?: it.blocked
                        )
                    } else it
                }
            )

            val request = UpdateContactRuleRequest(aiEnabled = aiEnabled, blocked = blocked)
            when (val result = contactsRepository.updateContactRule(contactId, request)) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        contacts = _uiState.value.contacts.map {
                            if (it.id == contactId) result.data else it
                        }
                    )
                }
                is NetworkResult.Error -> {
                    // Revert on error
                    loadContacts()
                }
                else -> {}
            }
        }
    }
}

@Composable
fun ContactRulesScreen(
    viewModel: ContactsViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    val filteredContacts = remember(uiState.contacts, viewModel.searchQuery) {
        if (viewModel.searchQuery.isBlank()) {
            uiState.contacts
        } else {
            val q = viewModel.searchQuery.lowercase()
            uiState.contacts.filter {
                (it.displayName?.lowercase()?.contains(q) == true) ||
                it.waJid.lowercase().contains(q)
            }
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Contact AI Rules",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.loadContacts() }) {
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
            // Search Bar
            OutlinedTextField(
                value = viewModel.searchQuery,
                onValueChange = { viewModel.searchQuery = it },
                placeholder = { Text("Search by name or number...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (viewModel.searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear")
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            if (uiState.errorMessage != null) {
                ErrorBanner(
                    message = uiState.errorMessage!!,
                    onRetry = { viewModel.loadContacts() },
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            if (uiState.isLoading && uiState.contacts.isEmpty()) {
                LoadingView("Loading contacts...")
            } else if (filteredContacts.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.ContactPage,
                    title = "No Contacts Found",
                    subtitle = if (viewModel.searchQuery.isNotEmpty()) "No contacts matching '${viewModel.searchQuery}'" else "Contacts will appear here as incoming WhatsApp chats arrive."
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredContacts, key = { it.id }) { contact ->
                        ContactRuleCard(
                            contact = contact,
                            onToggleAi = { enabled -> viewModel.updateRule(contact.id, aiEnabled = enabled) },
                            onToggleBlock = { blocked -> viewModel.updateRule(contact.id, blocked = blocked) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ContactRuleCard(
    contact: ContactDTO,
    onToggleAi: (Boolean) -> Unit,
    onToggleBlock: (Boolean) -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = CircleShape,
                    color = if (contact.blocked) MaterialTheme.colorScheme.error.copy(alpha = 0.15f) else WhatsAppGreenPrimary.copy(alpha = 0.15f),
                    modifier = Modifier.size(44.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (contact.blocked) Icons.Default.Block else Icons.Default.Person,
                            contentDescription = null,
                            tint = if (contact.blocked) MaterialTheme.colorScheme.error else WhatsAppGreenPrimary
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = contact.displayName ?: "+${contact.waJid.split("@")[0]}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "+${contact.waJid.split("@")[0]}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }

                if (contact.blocked) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.error.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = "BLOCKED",
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            Spacer(modifier = Modifier.height(8.dp))

            // Controls Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // AI Toggle
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "AI Auto-Reply", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(
                        checked = contact.aiEnabled && !contact.blocked,
                        onCheckedChange = { onToggleAi(it) },
                        enabled = !contact.blocked,
                        colors = SwitchDefaults.colors(checkedThumbColor = WhatsAppGreenDark)
                    )
                }

                // Block Toggle
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "Block", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(
                        checked = contact.blocked,
                        onCheckedChange = { onToggleBlock(it) },
                        colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.error)
                    )
                }
            }
        }
    }
}
