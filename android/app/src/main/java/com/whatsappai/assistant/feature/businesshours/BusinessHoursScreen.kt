package com.whatsappai.assistant.feature.businesshours

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.whatsappai.assistant.core.ui.components.appSwitchColors
import com.whatsappai.assistant.data.model.BusinessHourDTO
import com.whatsappai.assistant.data.model.UpdateBusinessHoursRequest
import com.whatsappai.assistant.data.repository.BusinessHoursRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.TimeZone

data class BusinessHoursUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val schedule: List<BusinessHourDTO> = emptyList(),
    val timezone: String = TimeZone.getDefault().id,
    val outsideHoursAction: String = "DO_NOTHING",
    val outsideHoursMessage: String = "We are currently closed for the day.",
    val saveSuccess: Boolean = false,
    val errorMessage: String? = null
)

class BusinessHoursViewModel(
    private val repository: BusinessHoursRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BusinessHoursUiState(isLoading = true))
    val uiState: StateFlow<BusinessHoursUiState> = _uiState.asStateFlow()

    init {
        loadSchedule()
    }

    fun loadSchedule() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            when (val result = repository.getSchedule()) {
                is NetworkResult.Success -> {
                    val list = result.data
                    val tz = list.firstOrNull()?.timezone ?: TimeZone.getDefault().id
                    val action = list.firstOrNull()?.outsideHoursAction ?: "DO_NOTHING"
                    val msg = list.firstOrNull()?.outsideHoursMessage ?: "We are currently closed for the day."

                    _uiState.value = BusinessHoursUiState(
                        isLoading = false,
                        schedule = list,
                        timezone = tz,
                        outsideHoursAction = action,
                        outsideHoursMessage = msg
                    )
                }
                is NetworkResult.Error -> {
                    _uiState.value = BusinessHoursUiState(
                        isLoading = false,
                        errorMessage = result.message
                    )
                }
                else -> {}
            }
        }
    }

    fun toggleDay(dayOfWeek: Int, enabled: Boolean) {
        val updated = _uiState.value.schedule.map {
            if (it.dayOfWeek == dayOfWeek) it.copy(enabled = enabled) else it
        }
        _uiState.value = _uiState.value.copy(schedule = updated)
    }

    fun updateTimes(dayOfWeek: Int, startTime: String, endTime: String) {
        val updated = _uiState.value.schedule.map {
            if (it.dayOfWeek == dayOfWeek) it.copy(startTime = startTime, endTime = endTime) else it
        }
        _uiState.value = _uiState.value.copy(schedule = updated)
    }

    fun setTimezone(tz: String) {
        _uiState.value = _uiState.value.copy(timezone = tz)
    }

    fun setOutsideAction(action: String) {
        _uiState.value = _uiState.value.copy(outsideHoursAction = action)
    }

    fun setOutsideMessage(msg: String) {
        _uiState.value = _uiState.value.copy(outsideHoursMessage = msg)
    }

    fun saveSchedule() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, saveSuccess = false, errorMessage = null)

            val updatedList = _uiState.value.schedule.map {
                it.copy(
                    timezone = _uiState.value.timezone,
                    outsideHoursAction = _uiState.value.outsideHoursAction,
                    outsideHoursMessage = _uiState.value.outsideHoursMessage
                )
            }

            when (val result = repository.updateSchedule(UpdateBusinessHoursRequest(updatedList))) {
                is NetworkResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        schedule = result.data,
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
fun BusinessHoursScreen(
    viewModel: BusinessHoursViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    val dayNames = listOf("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")

    LaunchedEffect(uiState.saveSuccess) {
        if (uiState.saveSuccess) {
            snackbarHostState.showSnackbar("Business hours schedule saved successfully!")
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            AppTopBar(
                title = "Business Hours",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack,
                actions = {
                    IconButton(onClick = { viewModel.saveSchedule() }, enabled = !uiState.isSaving) {
                        Icon(Icons.Default.Save, contentDescription = "Save")
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading && uiState.schedule.isEmpty()) {
            LoadingView("Loading business schedule...")
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
                    ErrorBanner(message = uiState.errorMessage!!, onRetry = { viewModel.loadSchedule() })
                }

                // Timezone Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(text = "Operating Timezone", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(text = "Schedule evaluation uses this timezone, regardless of server location.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = uiState.timezone,
                            onValueChange = { viewModel.setTimezone(it) },
                            leadingIcon = { Icon(Icons.Default.Language, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }

                // Outside Hours Action Card
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(text = "Outside Hours Action", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(text = "Choose what the bot should do when messages arrive outside operating hours.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(
                                selected = uiState.outsideHoursAction == "DO_NOTHING",
                                onClick = { viewModel.setOutsideAction("DO_NOTHING") },
                                label = { Text("Do Nothing (Stay Silent)") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = WhatsAppGreenDark,
                                    selectedLabelColor = Color.White
                                )
                            )
                            FilterChip(
                                selected = uiState.outsideHoursAction == "SEND_CUSTOM_MESSAGE",
                                onClick = { viewModel.setOutsideAction("SEND_CUSTOM_MESSAGE") },
                                label = { Text("Send Away Message") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = WhatsAppGreenDark,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }

                        if (uiState.outsideHoursAction == "SEND_CUSTOM_MESSAGE") {
                            OutlinedTextField(
                                value = uiState.outsideHoursMessage,
                                onValueChange = { viewModel.setOutsideMessage(it) },
                                label = { Text("Custom Away Message") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(100.dp),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                }

                // 7-Day Schedule
                Text(
                    text = "Weekly Schedule",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                uiState.schedule.sortedBy { it.dayOfWeek }.forEach { dayItem ->
                    val dayName = dayNames.getOrElse(dayItem.dayOfWeek) { "Day ${dayItem.dayOfWeek}" }

                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = dayName,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Switch(
                                    checked = dayItem.enabled,
                                    onCheckedChange = { viewModel.toggleDay(dayItem.dayOfWeek, it) },
                                    colors = appSwitchColors()
                                )
                            }

                            if (dayItem.enabled) {
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    OutlinedTextField(
                                        value = dayItem.startTime,
                                        onValueChange = { viewModel.updateTimes(dayItem.dayOfWeek, it, dayItem.endTime) },
                                        label = { Text("Start Time") },
                                        placeholder = { Text("09:00") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true,
                                        shape = RoundedCornerShape(10.dp)
                                    )
                                    Text("to", fontWeight = FontWeight.Bold)
                                    OutlinedTextField(
                                        value = dayItem.endTime,
                                        onValueChange = { viewModel.updateTimes(dayItem.dayOfWeek, dayItem.startTime, it) },
                                        label = { Text("End Time") },
                                        placeholder = { Text("18:00") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true,
                                        shape = RoundedCornerShape(10.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = { viewModel.saveSchedule() },
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
                        Text("Save Settings", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
