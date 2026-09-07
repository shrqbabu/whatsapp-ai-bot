package com.whatsappai.assistant.core.network

import com.whatsappai.assistant.core.storage.TokenManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
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

class ApiClient(private val tokenManager: TokenManager) {

    private var cachedRetrofit: Retrofit? = null
    private var cachedBaseUrl: String? = null

    private fun getOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(logging)
            .connectTimeout(ApiConstants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(ApiConstants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(ApiConstants.TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build()
    }

    fun getRetrofit(): Retrofit {
        val currentBaseUrl = tokenManager.getServerUrl().trimEnd('/') + "/"
        if (cachedRetrofit == null || cachedBaseUrl != currentBaseUrl) {
            cachedBaseUrl = currentBaseUrl
            cachedRetrofit = Retrofit.Builder()
                .baseUrl(currentBaseUrl)
                .client(getOkHttpClient())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return cachedRetrofit!!
    }

    fun <T> createService(serviceClass: Class<T>): T {
        return getRetrofit().create(serviceClass)
    }
}
