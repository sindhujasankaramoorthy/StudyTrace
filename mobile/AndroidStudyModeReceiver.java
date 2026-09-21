package com.studytrace.mobile;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.os.Build;
import android.util.Log;

/**
 * AndroidStudyModeReceiver
 * 
 * Android BroadcastReceiver that detects Focus / Do Not Disturb (DND) mode state changes,
 * system reboots, and network reconnection events.
 * 
 * Automatically triggers background tracking via StudyModeForegroundService
 * and syncs completed sessions to the backend.
 */
public class AndroidStudyModeReceiver extends BroadcastReceiver {
    private static final String TAG = "StudyTraceReceiver";
    private static final String PREFS_NAME = "StudyTracePrefs";
    private static final String KEY_START_TIME = "focus_start_time";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();

        Log.d(TAG, "Received Broadcast Action: " + action);

        // 1. DND / Focus Mode State Change
        if (NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED.equals(action)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    int filter = nm.getCurrentInterruptionFilter();
                    boolean isFocusActive = (filter == NotificationManager.INTERRUPTION_FILTER_NONE 
                                          || filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY 
                                          || filter == NotificationManager.INTERRUPTION_FILTER_ALARMS);

                    Intent serviceIntent = new Intent(context, StudyModeForegroundService.class);
                    if (isFocusActive) {
                        Log.d(TAG, "System Focus Mode ACTIVATED. Starting Foreground Service...");
                        serviceIntent.setAction("ACTION_START_TRACKING");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent);
                        } else {
                            context.startService(serviceIntent);
                        }
                    } else {
                        Log.d(TAG, "System Focus Mode DEACTIVATED. Stopping Foreground Service & Syncing...");
                        serviceIntent.setAction("ACTION_STOP_TRACKING");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent);
                        } else {
                            context.startService(serviceIntent);
                        }
                    }
                }
            }
        }
        
        // 2. Reboot Survival: Phone restarted while Focus Mode was ON
        else if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            long startTime = prefs.getLong(KEY_START_TIME, 0);

            if (startTime > 0) {
                Log.d(TAG, "Phone rebooted while session was active. Resuming Foreground Tracking...");
                Intent serviceIntent = new Intent(context, StudyModeForegroundService.class);
                serviceIntent.setAction("ACTION_START_TRACKING");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }

            // Flush any pending offline queue
            OfflineSyncManager.processPendingQueue(context);
        }

        // 3. Network Connection Re-established
        else if (ConnectivityManager.CONNECTIVITY_ACTION.equals(action)) {
            if (OfflineSyncManager.isNetworkAvailable(context)) {
                Log.d(TAG, "Network connection restored. Flushing offline sync queue...");
                OfflineSyncManager.processPendingQueue(context);
            }
        }
    }
}
