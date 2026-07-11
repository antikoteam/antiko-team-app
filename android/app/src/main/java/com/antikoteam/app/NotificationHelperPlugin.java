package com.antikoteam.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;
import android.os.Build;

@CapacitorPlugin(
    name = "NotificationHelper",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        )
    }
)
public class NotificationHelperPlugin extends Plugin {

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (getPermissionState("notifications") != PermissionState.GRANTED) {
                requestPermissionForAlias("notifications", call, "permissionCallback");
            } else {
                JSObject response = new JSObject();
                response.put("granted", true);
                call.resolve(response);
            }
        } else {
            JSObject response = new JSObject();
            response.put("granted", true);
            call.resolve(response);
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject response = new JSObject();
        if (Build.VERSION.SDK_INT >= 33) {
            response.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        } else {
            response.put("granted", true);
        }
        call.resolve(response);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject response = new JSObject();
        response.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(response);
    }
}
