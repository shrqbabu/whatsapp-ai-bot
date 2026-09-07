package com.whatsappai.assistant.core.network

import com.whatsappai.assistant.core.storage.TokenManager
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import com.google.gson.GsonBuilder
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val requestBuilder = chain.request().newBuilder()
        val token = tokenManager.getToken()
        if (!token.isNullOrBlank()) {
            requestBuilder.addHeader(ApiConstants.HEADER_AUTHORIZATION, "${ApiConstants.TOKEN_PREFIX}$token")
        }
        return chain.proceed(requestBuilder.build())
    }
}

class HostSelectionInterceptor(private val tokenManager: TokenManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()
        var serverUrl = tokenManager.getServerUrl().trim()
        if (!serverUrl.startsWith("http://", ignoreCase = true) && !serverUrl.startsWith("https://", ignoreCase = true)) {
            serverUrl = "https://$serverUrl"
        }
        val newHttpUrl = serverUrl.toHttpUrlOrNull()
        if (newHttpUrl != null) {
            val originalUrl = request.url
            val newUrlBuilder = originalUrl.newBuilder()
                .scheme(newHttpUrl.scheme)
                .host(newHttpUrl.host)
                .port(newHttpUrl.port)

            request = request.newBuilder()
                .url(newUrlBuilder.build())
                .build()
        }
        return chain.proceed(request)
    }
}

class ApiClient(private val tokenManager: TokenManager) {

    private var cachedRetrofit: Retrofit? = null
    private var cachedBaseUrl: String? = null

    private fun getOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(HostSelectionInterceptor(tokenManager))
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(logging)
            .connectTimeout(ApiConstants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(ApiConstants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(ApiConstants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build()
    }

    fun getRetrofit(): Retrofit {
        var currentBaseUrl = tokenManager.getServerUrl().trim().trimEnd('/') + "/"
        if (!currentBaseUrl.startsWith("http://", ignoreCase = true) && !currentBaseUrl.startsWith("https://", ignoreCase = true)) {
            currentBaseUrl = "https://$currentBaseUrl"
        }
        if (cachedRetrofit == null || cachedBaseUrl != currentBaseUrl) {
            cachedBaseUrl = currentBaseUrl
            val gson = GsonBuilder()
                .setLenient()
                .create()
            cachedRetrofit = Retrofit.Builder()
                .baseUrl(currentBaseUrl)
                .client(getOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build()
        }
        return cachedRetrofit!!
    }

    fun <T> createService(serviceClass: Class<T>): T {
        return getRetrofit().create(serviceClass)
    }
}
