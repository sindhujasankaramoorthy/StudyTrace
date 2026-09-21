package com.studytrace.mobile;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.UUID;

/**
 * AndroidStudyModeReceiver
 * 
 * Android BroadcastReceiver that detects Focus / Do Not Disturb (DND) mode state changes.
 * - When Focus mode activates: records session start timestamp and generates a clientSessionId.
 * - When Focus mode deactivates: calculates duration and automatically synchronizes 
 *   the tracked phone focus session with the StudyTrace backend server with idempotency support.
 */
public class AndroidStudyModeReceiver extends BroadcastReceiver {
    private static final String TAG = "StudyTraceMobile";
    private static final String PREFS_NAME = "StudyTracePrefs";
    private static final String KEY_START_TIME = "focus_start_time";
    private static final String KEY_SESSION_ID = "focus_client_session_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String action = intent.getAction();
            if (NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED.equals(action)) {
                NotificationManager notificationManager = 
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                
                if (notificationManager != null) {
                    int filter = notificationManager.getCurrentInterruptionFilter();
                    boolean isFocusActive = (filter == NotificationManager.INTERRUPTION_FILTER_NONE 
                                          || filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY 
                                          || filter == NotificationManager.INTERRUPTION_FILTER_ALARMS);

                    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

                    if (isFocusActive) {
                        // Focus Mode activated
                        long startTime = System.currentTimeMillis();
                        String clientSessionId = "mob_" + UUID.randomUUID().toString();
                        
                        prefs.edit()
                            .putLong(KEY_START_TIME, startTime)
                            .putString(KEY_SESSION_ID, clientSessionId)
                            .apply();

                        Log.d(TAG, "Phone Focus Mode ACTIVATED. Session ID: " + clientSessionId);
                    } else {
                        // Focus Mode deactivated
                        long startTime = prefs.getLong(KEY_START_TIME, 0);
                        String clientSessionId = prefs.getString(KEY_SESSION_ID, null);

                        if (startTime > 0 && clientSessionId != null) {
                            long endTime = System.currentTimeMillis();
                            long durationSeconds = (endTime - startTime) / 1000;

                            if (durationSeconds >= 5) { // Minimum 5s session
                                syncSessionToBackend(context, startTime, endTime, durationSeconds, clientSessionId);
                            }

                            // Reset storage
                            prefs.edit().remove(KEY_START_TIME).remove(KEY_SESSION_ID).apply();
                        }
                    }
                }
            }
        }
    }

    private void syncSessionToBackend(Context context, long startTimeMs, long endTimeMs, long durationSec, String clientSessionId) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String serverUrl = prefs.getString("backend_url", "https://studytrace-api.onrender.com/api/sessions");
                String authToken = prefs.getString("auth_token", "");

                URL url = new URL(serverUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                if (!authToken.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + authToken);
                }
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("subject", "Phone Focus Session");
                payload.put("category", "General");
                payload.put("deviceCategory", "Phone Time");
                payload.put("device", "Mobile");
                payload.put("startTime", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(new java.util.Date(startTimeMs)));
                payload.put("endTime", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(new java.util.Date(endTimeMs)));
                payload.put("duration", durationSec);
                payload.put("clientSessionId", clientSessionId);
                payload.put("notes", "Automatically synchronized from Android Focus/DND mode");

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes("utf-8");
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                Log.d(TAG, "Sync Mobile Session response code: " + code);
            } catch (Exception e) {
                Log.e(TAG, "Failed to sync phone session to StudyTrace backend", e);
            }
        }).start();
    }
}
