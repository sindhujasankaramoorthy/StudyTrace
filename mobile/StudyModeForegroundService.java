package com.studytrace.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

/**
 * StudyModeForegroundService
 * 
 * Android Foreground Service that maintains continuous background tracking when
 * system Focus / Do Not Disturb Mode is active.
 * Ensures tracking persists even when screen is locked, app UI is closed, or device
 * enters battery saver mode.
 */
public class StudyModeForegroundService extends Service {
    private static final String TAG = "StudyTraceService";
    private static final String CHANNEL_ID = "StudyTraceTrackingChannel";
    private static final int NOTIFICATION_ID = 8801;

    private static final String PREFS_NAME = "StudyTracePrefs";
    private static final String KEY_START_TIME = "focus_start_time";
    private static final String KEY_SESSION_ID = "focus_client_session_id";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if ("ACTION_START_TRACKING".equals(action)) {
            startTrackingSession();
        } else if ("ACTION_STOP_TRACKING".equals(action)) {
            stopTrackingSession();
        }

        return START_STICKY;
    }

    private void startTrackingSession() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long existingStartTime = prefs.getLong(KEY_START_TIME, 0);

        if (existingStartTime == 0) {
            long startTime = System.currentTimeMillis();
            String clientSessionId = "mob_" + UUID.randomUUID().toString();

            prefs.edit()
                .putLong(KEY_START_TIME, startTime)
                .putString(KEY_SESSION_ID, clientSessionId)
                .apply();

            Log.d(TAG, "Foreground Service STARTED tracking session ID: " + clientSessionId);
        }

        Notification notification = buildForegroundNotification("Focus Mode Tracked Session Active");
        startForeground(NOTIFICATION_ID, notification);
    }

    private void stopTrackingSession() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long startTime = prefs.getLong(KEY_START_TIME, 0);
        String clientSessionId = prefs.getString(KEY_SESSION_ID, null);

        if (startTime > 0 && clientSessionId != null) {
            long endTime = System.currentTimeMillis();
            long durationSeconds = Math.max(1, (endTime - startTime) / 1000);

            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));

                JSONObject payload = new JSONObject();
                payload.put("subject", "Phone Focus Session");
                payload.put("category", "General");
                payload.put("deviceCategory", "Phone Time");
                payload.put("device", "Mobile");
                payload.put("source", "study-mode");
                payload.put("status", "completed");
                payload.put("startTime", sdf.format(new Date(startTime)));
                payload.put("endTime", sdf.format(new Date(endTime)));
                payload.put("duration", durationSeconds);
                payload.put("clientSessionId", clientSessionId);
                payload.put("notes", "Automatically tracked via Android Study/Focus Mode");

                if (OfflineSyncManager.isNetworkAvailable(this)) {
                    boolean success = OfflineSyncManager.sendPayloadToBackend(this, payload);
                    if (!success) {
                        OfflineSyncManager.enqueueSession(this, payload);
                    }
                } else {
                    OfflineSyncManager.enqueueSession(this, payload);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error constructing session sync payload", e);
            }

            prefs.edit().remove(KEY_START_TIME).remove(KEY_SESSION_ID).apply();
        }

        stopForeground(true);
        stopSelf();
    }

    private Notification buildForegroundNotification(String message) {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
            .setContentTitle("StudyTrace — Automatic Tracking")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "StudyTrace Tracking Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows active background tracking status for StudyTrace Focus Mode");

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
