# Proguard rules for WhatsApp AI Assistant
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.whatsappai.assistant.data.model.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
