# ==============================================================================
# SkillSprint AI - Release ProGuard & R8 Obfuscation & Shrinking Rules
# ==============================================================================

# Flutter Engine & Channel Bridge preservation
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Keep Flutter method channels and event channels
-keepclassmembers class * {
    @io.flutter.plugin.common.MethodChannel$MethodCallHandler *;
    @io.flutter.plugin.common.EventChannel$StreamHandler *;
}

# Google Play In-App Billing (Play Billing Library 6.x / 7.x)
-keep class com.android.vending.billing.** { *; }
-keep class com.android.billingclient.api.** { *; }
-dontwarn com.android.billingclient.**

# Android Architecture Components & ViewModel
-keep class androidx.lifecycle.DefaultLifecycleObserver { *; }
-keep class androidx.lifecycle.LifecycleObserver { *; }
-keep public class * extends androidx.lifecycle.ViewModel {
    public <init>();
}

# Keep native methods and JNI bindings
-keepclasseswithmembernames class * {
    native <methods>;
}

# JSON / Gson / Model serialization preservation
-keepattributes *Annotation*,EnclosingMethod,Signature,InnerClasses
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable CREATORs
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}

# Preserve line numbers for Google Play Console de-obfuscation with mapping.txt
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable
