# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, keeping JS interfaces is crucial
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve the LineNumberTable for crash reporting (optional but recommended)
-keepattributes SourceFile,LineNumberTable

# Hide the original source file name (optional)
-renamesourcefileattribute SourceFile

# Capacitor specific rules (ensure plugins and native bridge remain intact)
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keep public class * extends com.getcapacitor.BridgeFragment { *; }

# Firebase (if used)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Capawesome Firebase Auth (Ignore unused OAuth SDKs and protect bridging)
-dontwarn com.facebook.**
-dontwarn com.twitter.**
-dontwarn com.microsoft.**
-keep class io.capawesome.capacitorjs.** { *; }
