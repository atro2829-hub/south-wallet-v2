package com.qtbm.south;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class SouthFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "SouthFCM";

    // Notification channel IDs
    public static final String CHANNEL_TRANSFERS = "transfers";
    public static final String CHANNEL_DEPOSITS = "deposits";
    public static final String CHANNEL_WITHDRAWALS = "withdrawals";
    public static final String CHANNEL_ORDERS = "orders";
    public static final String CHANNEL_SECURITY = "security";
    public static final String CHANNEL_PROMO = "promo";
    public static final String CHANNEL_GENERAL = "general";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token received: " + token);
        // The client-side JS will handle saving this token to Firebase RTDB
        // We broadcast it so the web layer can pick it up
        Intent intent = new Intent("com.qtbm.south.FCM_TOKEN");
        intent.setPackage(getPackageName());
        intent.putExtra("token", token);
        sendBroadcast(intent);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        String title = "محفظة الجنوب";
        String body = "";
        String type = "general";
        String soundType = "notification";
        String clickAction = null;

        // Check if message contains a notification payload
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null
                    ? remoteMessage.getNotification().getTitle() : title;
            body = remoteMessage.getNotification().getBody() != null
                    ? remoteMessage.getNotification().getBody() : body;
        }

        // Check if message contains data payload
        if (remoteMessage.getData().size() > 0) {
            if (remoteMessage.getData().containsKey("type")) {
                type = remoteMessage.getData().get("type");
            }
            if (remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
            if (remoteMessage.getData().containsKey("sound")) {
                soundType = remoteMessage.getData().get("sound");
            }
            if (remoteMessage.getData().containsKey("click_action")) {
                clickAction = remoteMessage.getData().get("click_action");
            }
        }

        // Determine channel based on type
        String channelId = getChannelForType(type);
        int soundResId = getSoundForType(type);

        // Show notification
        showNotification(title, body, channelId, soundResId, type, remoteMessage.getData());
    }

    private String getChannelForType(String type) {
        switch (type) {
            case "transaction":
                return CHANNEL_TRANSFERS;
            case "security":
                return CHANNEL_SECURITY;
            case "promo":
                return CHANNEL_PROMO;
            default:
                return CHANNEL_GENERAL;
        }
    }

    private int getSoundForType(String type) {
        switch (type) {
            case "transaction":
                return R.raw.transfer_sound;
            case "security":
                return R.raw.security_sound;
            case "promo":
                return R.raw.promo_sound;
            default:
                return R.raw.notification_sound;
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();

            // Transfers channel - high priority
            NotificationChannel transfersChannel = new NotificationChannel(
                    CHANNEL_TRANSFERS, "التحويلات", NotificationManager.IMPORTANCE_HIGH);
            transfersChannel.setDescription("إشعارات التحويلات المالية");
            transfersChannel.enableVibration(true);
            transfersChannel.setVibrationPattern(new long[]{0, 100, 50, 100, 50, 100});
            transfersChannel.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.transfer_sound), audioAttributes);
            transfersChannel.setShowBadge(true);
            transfersChannel.enableLights(true);
            transfersChannel.setLightColor(0xE60000);
            manager.createNotificationChannel(transfersChannel);

            // Deposits channel
            NotificationChannel depositsChannel = new NotificationChannel(
                    CHANNEL_DEPOSITS, "الإيداعات", NotificationManager.IMPORTANCE_HIGH);
            depositsChannel.setDescription("إشعارات الإيداعات");
            depositsChannel.enableVibration(true);
            depositsChannel.setVibrationPattern(new long[]{0, 100, 50, 100});
            depositsChannel.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.deposit_sound), audioAttributes);
            depositsChannel.setShowBadge(true);
            depositsChannel.enableLights(true);
            depositsChannel.setLightColor(0x00C853);
            manager.createNotificationChannel(depositsChannel);

            // Withdrawals channel
            NotificationChannel withdrawalsChannel = new NotificationChannel(
                    CHANNEL_WITHDRAWALS, "السحوبات", NotificationManager.IMPORTANCE_HIGH);
            withdrawalsChannel.setDescription("إشعارات السحوبات");
            withdrawalsChannel.enableVibration(true);
            withdrawalsChannel.setVibrationPattern(new long[]{0, 150, 50, 150});
            withdrawalsChannel.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.withdraw_sound), audioAttributes);
            withdrawalsChannel.setShowBadge(true);
            withdrawalsChannel.enableLights(true);
            withdrawalsChannel.setLightColor(0xFF6D00);
            manager.createNotificationChannel(withdrawalsChannel);

            // Orders channel
            NotificationChannel ordersChannel = new NotificationChannel(
                    CHANNEL_ORDERS, "الطلبات", NotificationManager.IMPORTANCE_HIGH);
            ordersChannel.setDescription("إشعارات الطلبات والخدمات");
            ordersChannel.enableVibration(true);
            ordersChannel.setVibrationPattern(new long[]{0, 100, 50, 100, 50, 100});
            ordersChannel.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.order_sound), audioAttributes);
            ordersChannel.setShowBadge(true);
            ordersChannel.enableLights(true);
            ordersChannel.setLightColor(0x2979FF);
            manager.createNotificationChannel(ordersChannel);

            // Security channel - max priority
            NotificationChannel securityChannel = new NotificationChannel(
                    CHANNEL_SECURITY, "الأمان", NotificationManager.IMPORTANCE_MAX);
            securityChannel.setDescription("إشعارات الأمان والحساب");
            securityChannel.enableVibration(true);
            securityChannel.setVibrationPattern(new long[]{0, 200, 100, 200, 100, 200});
            securityChannel.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.security_sound), audioAttributes);
            securityChannel.setShowBadge(true);
            securityChannel.enableLights(true);
            securityChannel.setLightColor(0xFF1744);
            securityChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
            manager.createNotificationChannel(securityChannel);

            // Promo channel
            NotificationChannel promoChannel = new NotificationChannel(
                    CHANNEL_PROMO, "العروض", NotificationManager.IMPORTANCE_DEFAULT);
            promoChannel.setDescription("إشعارات العروض والتخفيضات");
            promoChannel.enableVibration(true);
            promoChannel.setVibrationPattern(new long[]{0, 50});
            promoChannel.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.promo_sound), audioAttributes);
            promoChannel.setShowBadge(true);
            manager.createNotificationChannel(promoChannel);

            // General channel
            NotificationChannel generalChannel = new NotificationChannel(
                    CHANNEL_GENERAL, "عام", NotificationManager.IMPORTANCE_HIGH);
            generalChannel.setDescription("الإشعارات العامة");
            generalChannel.enableVibration(true);
            generalChannel.setVibrationPattern(new long[]{0, 100, 50, 100});
            generalChannel.setSound(Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.notification_sound), audioAttributes);
            generalChannel.setShowBadge(true);
            generalChannel.enableLights(true);
            generalChannel.setLightColor(0xE60000);
            manager.createNotificationChannel(generalChannel);
        }
    }

    private void showNotification(String title, String body, String channelId, int soundResId, String type, java.util.Map<String, String> data) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        // Pass data to the activity
        if (data != null && !data.isEmpty()) {
            for (java.util.Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }
        intent.putExtra("notification_type", type);
        intent.putExtra("from_fcm", true);

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setContentIntent(pendingIntent)
                .setColor(0xE60000)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setDefaults(NotificationCompat.DEFAULT_ALL);

        // Unique notification ID based on time
        int notificationId = (int) System.currentTimeMillis();

        try {
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
            notificationManager.notify(notificationId, notificationBuilder.build());
            Log.d(TAG, "Notification displayed successfully: " + title);
        } catch (SecurityException e) {
            Log.e(TAG, "No notification permission: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification: " + e.getMessage());
        }
    }
}
