package com.whatsappai.assistant.core.network

object ApiConstants {
    const val HEADER_AUTHORIZATION = "Authorization"
    const val TOKEN_PREFIX = "Bearer "
    const val TIMEOUT_SECONDS = 30L
}

sealed class NetworkResult<out T> {
    data class Success<out T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val code: String? = null, val statusCode: Int? = null) : NetworkResult<Nothing>()
    object Loading : NetworkResult<Nothing>()
}
