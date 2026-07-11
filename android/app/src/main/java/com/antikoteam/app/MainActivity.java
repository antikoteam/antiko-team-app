package com.antikoteam.app;

import android.os.Bundle;
import android.os.Build;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int NOTIFICATION_PERMISSION_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalNotifyPlugin.class);
        registerPlugin(NotificationHelperPlugin.class);
        super.onCreate(savedInstanceState);

        // Request POST_NOTIFICATIONS permission on Android 13+ directly from system
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{"android.permission.POST_NOTIFICATIONS"},
                    NOTIFICATION_PERMISSION_CODE
                );
            }
        }

        // Optimize WebView performance
        try {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
            settings.setDomStorageEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setBlockNetworkImage(false);
            settings.setLoadsImagesAutomatically(true);
        } catch (Exception e) {
            // Silently ignore if WebView isn't ready yet
        }
    }
}
