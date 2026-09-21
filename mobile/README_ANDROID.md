# StudyTrace — Android Automatic Focus Mode Integration Guide

## Overview

StudyTrace includes native Android components that automatically detect when **Do Not Disturb / Focus Mode** is enabled or disabled on your target Android device.

When Focus Mode turns **ON**:
- `AndroidStudyModeReceiver` detects the interruption filter change.
- Starts `StudyModeForegroundService` with low-priority ongoing status notification.
- Captures `startTime` and generates a unique `clientSessionId`.

When Focus Mode turns **OFF**:
- Calculates `duration` in seconds.
- Automatically synchronizes the session with the StudyTrace backend (`source: "study-mode"`, `deviceCategory: "Phone Time"`).
- If offline, `OfflineSyncManager` queues the session locally and retries when internet becomes available.

---

## Required Android System Permissions

| Permission | Purpose |
|---|---|
| `ACCESS_NOTIFICATION_POLICY` | Permits reading system DND / Focus Mode state (`NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED`). |
| `RECEIVE_BOOT_COMPLETED` | Resumes background session tracking automatically if phone reboots while Focus Mode is active. |
| `FOREGROUND_SERVICE` | Prevents Android OS from killing the session tracker when screen is locked or app is closed. |
| `INTERNET` & `ACCESS_NETWORK_STATE` | Synchronizes tracked sessions with the StudyTrace backend API. |

---

## One-Time Android System Setup

### 1. Grant Do Not Disturb / Notification Policy Access
1. Open phone **Settings** &rarr; **Apps** &rarr; **Special App Access** &rarr; **Do Not Disturb Access**.
2. Enable access for **StudyTrace**.

### 2. Disable Battery Optimization (Optional but Recommended)
1. Open **Settings** &rarr; **Battery** &rarr; **Battery Optimization**.
2. Select **StudyTrace** &rarr; Set to **Don't Optimize** / **Unrestricted**.

---

## How to Test Focus Mode Auto-Tracking

1. Start the StudyTrace backend server:
   ```bash
   npm start
   ```
2. Open your phone's system pull-down menu or Settings and enable **Focus Mode / Do Not Disturb**.
3. *Without opening StudyTrace manually*, leave your phone locked or use other apps.
4. Disable **Focus Mode / Do Not Disturb**.
5. Open StudyTrace on your browser (`http://<LAPTOP_IP>:5000`).
6. The session will appear automatically on your dashboard:
   - **Label**: `📱 Automatically tracked | Source: Study Mode`
   - **Category**: `Phone Time`
