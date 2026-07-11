package com.antikoteam.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name = "LocalNotify")
public class LocalNotifyPlugin extends Plugin {
    private static final String CHANNEL_ID = "antiko_notifications";
    private static final String CHANNEL_NAME = "أنتيكو تيم";
    private static final AtomicInteger notificationId = new AtomicInteger(1000);

    @PluginMethod
    public void show(PluginCall call) {
        String title = call.getString("title", "أنتيكو تيم");
        String body = call.getString("body", "");

        Context context = getContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        // Create channel for Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("إشعارات تطبيق أنتيكو تيم");
            channel.enableVibration(true);
            manager.createNotificationChannel(channel);
        }

        // Build intent to open app when notification tapped
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Get icon resource (use app icon as fallback)
        int iconRes = context.getResources().getIdentifier("ic_launcher", "mipmap", context.getPackageName());
        if (iconRes == 0) iconRes = android.R.drawable.ic_dialog_info;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(new long[]{0, 300, 200, 300});

        manager.notify(notificationId.getAndIncrement(), builder.build());

        JSObject result = new JSObject();
        result.put("sent", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getFcmToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(new OnCompleteListener<String>() {
                @Override
                public void onComplete(@NonNull Task<String> task) {
                    JSObject response = new JSObject();
                    if (!task.isSuccessful()) {
                        response.put("token", "");
                        response.put("error", task.getException() != null ? task.getException().getMessage() : "Unknown error");
                        call.resolve(response);
                        return;
                    }
                    String token = task.getResult();
                    response.put("token", token);
                    call.resolve(response);
                }
            });
    }
}
