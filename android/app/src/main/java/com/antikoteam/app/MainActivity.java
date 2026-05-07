package com.antikoteam.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Optimize WebView performance
        try {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();

            // Enable hardware acceleration for smoother animations
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

            // Enable DOM storage & caching for faster loads
            settings.setDomStorageEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // Reduce rendering overhead
            settings.setBlockNetworkImage(false);
            settings.setLoadsImagesAutomatically(true);
        } catch (Exception e) {
            // Silently ignore if WebView isn't ready yet
        }
    }
}
