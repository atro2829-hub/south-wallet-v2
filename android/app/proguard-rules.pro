# ProGuard rules for South Wallet
# Keep all classes in the app package
-keep class com.qtbm.south.** { *; }
-keep class com.fahednet.wallet.** { *; }
-keep class com.fahd.net.** { *; }
-keep class com.getcapacitor.** { *; }

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

# Keep Android support library
-keep class androidx.** { *; }
-dontwarn androidx.**

# Keep Capacitor plugin classes
-keep class com.capacitorjs.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class *

# Keep WebView related classes (Capacitor uses WebView)
-keep class android.webkit.** { *; }
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}

# Keep JavaScript interface classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep model classes (for JSON deserialization)
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Don't warn about missing optional classes
-dontwarn org.apache.http.**
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**

# Remove logging
-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
}
