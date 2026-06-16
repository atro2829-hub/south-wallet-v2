package com.qtbm.south.admin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Receives FCM token broadcasts from AdminFirebaseMessagingService
 * and saves them to SharedPreferences for the web layer to access.
 */
public class AdminFCMTokenReceiver extends BroadcastReceiver {

    private static final String TAG = "AdminFCMTokenReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if ("com.qtbm.south.admin.FCM_TOKEN".equals(action)) {
            String token = intent.getStringExtra("token");
            if (token != null) {
                Log.d(TAG, "FCM token received, saving to SharedPreferences");
                context.getSharedPreferences("south_admin_prefs", Context.MODE_PRIVATE)
                        .edit()
                        .putString("fcm_token", token)
                        .apply();
            }
        }
    }
}
