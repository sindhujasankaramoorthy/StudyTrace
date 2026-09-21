package com.studytrace.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * OfflineSyncManager
 * 
 * Manages resilient offline session queuing, network status checking,
 * and automatic synchronization retries to the StudyTrace backend API.
 */
public class OfflineSyncManager {
    private static final String TAG = "StudyTraceOfflineSync";
    private static final String PREFS_NAME = "StudyTracePrefs";
    private static final String KEY_PENDING_QUEUE = "pending_sessions_queue";

    public static boolean isNetworkAvailable(Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo netInfo = cm.getActiveNetworkInfo();
        return netInfo != null && netInfo.isConnected();
    }

    public static void enqueueSession(Context context, JSONObject sessionPayload) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existingQueueStr = prefs.getString(KEY_PENDING_QUEUE, "[]");
            JSONArray queue = new JSONArray(existingQueueStr);
            queue.put(sessionPayload);

            prefs.edit().putString(KEY_PENDING_QUEUE, queue.toString()).apply();
            Log.d(TAG, "Enqueued pending session offline. Total queued: " + queue.length());
        } catch (Exception e) {
            Log.e(TAG, "Failed to enqueue offline session", e);
        }
    }

    public static void processPendingQueue(Context context) {
        if (!isNetworkAvailable(context)) {
            Log.d(TAG, "Network unavailable. Postponing offline queue sync.");
            return;
        }

        new Thread(() -> {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String existingQueueStr = prefs.getString(KEY_PENDING_QUEUE, "[]");
                JSONArray queue = new JSONArray(existingQueueStr);

                if (queue.length() == 0) return;

                Log.d(TAG, "Processing " + queue.length() + " offline pending sessions...");
                JSONArray remainingQueue = new JSONArray();

                for (int i = 0; i < queue.length(); i++) {
                    JSONObject sessionPayload = queue.getJSONObject(i);
                    boolean success = sendPayloadToBackend(context, sessionPayload);
                    if (!success) {
                        remainingQueue.put(sessionPayload);
                    }
                }

                prefs.edit().putString(KEY_PENDING_QUEUE, remainingQueue.toString()).apply();
                Log.d(TAG, "Offline sync complete. Remaining queued: " + remainingQueue.length());
            } catch (Exception e) {
                Log.e(TAG, "Error processing offline sync queue", e);
            }
        }).start();
    }

    public static boolean sendPayloadToBackend(Context context, JSONObject payload) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String serverUrl = prefs.getString("backend_url", "https://studytrace-api.onrender.com/api/sessions");
            String authToken = prefs.getString("auth_token", "");

            URL url = new URL(serverUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; utf-8");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (authToken != null && !authToken.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
            }
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = payload.toString().getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            Log.d(TAG, "Sync payload response code: " + code);
            return (code >= 200 && code < 300);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send session payload to backend", e);
            return false;
        }
    }
}
