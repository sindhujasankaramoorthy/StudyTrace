# StudyTrace — Cross-Device Study Time Tracking System

### Problem Statement

Students often find it difficult to accurately measure how much time they actually spend studying. Traditional study timers require users to manually start and stop sessions, which can be inconvenient and may lead to inaccurate records. In addition, students may switch between devices during the day—for example, using a laptop during college hours and a phone at home—making it difficult to maintain a single, continuous record of their study time.

Therefore, there is a need for a **cross-device study tracking system** that can automatically identify study sessions based on device activity or Focus/Study Mode, synchronize the recorded sessions, and provide a unified view of the student's actual focused study time.

### Abstract

**StudyTrace** is a cross-device study time tracking application designed to help students automatically monitor and analyze their focused study time. On mobile devices, the system can integrate with the phone's **Study/Focus Mode** to identify when a study session begins and ends. When the phone is unavailable, such as during college hours, StudyTrace can track active usage on a laptop or desktop device.

The recorded sessions are synchronized through a cloud-based backend, allowing users to maintain their study history across multiple devices. The application provides a dashboard containing **daily, weekly, and monthly study reports, total focused time, session history, study streaks, and graphical analytics**.

---

## Build 5: Automatic Cross-Device Tracking, Deduplication & Production Deployment

Build 5 expands StudyTrace into a complete multi-device ecosystem featuring Android Focus Mode integration, lightweight Laptop activity tracking with auto-pause, idempotent cross-device sync deduplication (`clientSessionId`), configurable CORS, and expanded dashboard KPI metrics.

### Key Build 5 Features
1. **Android Focus / DND Mode Receiver (`mobile/AndroidStudyModeReceiver.java`)**:
   - Native BroadcastReceiver listening for `ACTION_INTERRUPTION_FILTER_CHANGED`.
   - Records session start timestamp when Focus/DND mode activates, auto-computes duration when deactivated, and dispatches to backend with `deviceCategory: "Phone Time"`.
2. **Laptop Interaction Tracker (`js/laptop-tracker.js`)**:
   - Monitors active keyboard and mouse events (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`).
   - Automatically triggers auto-pause when inactive beyond 60 seconds and auto-resumes session on user activity (labeled "Active Device Time").
3. **Cross-Device Deduplication (`clientSessionId`)**:
   - Assigns unique UUID / client session IDs to prevent duplicate records when offline or retrying synchronization across devices.
4. **Production Deployment Ready**:
   - Configurable `CORS_ORIGIN` environment variable.
   - Stack traces hidden in production (`NODE_ENV=production`).
   - Atlas MongoDB URI connection support.
5. **Expanded Dashboard KPI Cards**:
   - Displays 5 core metrics: **Today's Focus Time**, **Weekly Focused Time**, **Monthly Focused Time**, **Tracked Phone Focus Time**, and **Laptop Active Time**.

---

### Project Structure
```text
StudyTrace/
├── .env                  # Private environment variables (PORT, MONGODB_URI, JWT_SECRET, CORS_ORIGIN)
├── .env.example          # Environment template
├── .gitignore            # Git exclusion rules (node_modules, .env)
├── package.json          # Node project manifest & dependencies
├── server.js             # Express application entry point, CORS & static server
├── mobile/
│   └── AndroidStudyModeReceiver.java # Android Focus/DND BroadcastReceiver auto-sync handler
├── server/
│   ├── config/
│   │   └── db.js         # Mongoose connection manager with quick timeout & fallback
│   ├── controllers/
│   │   ├── authController.js      # User registration, login, & profile endpoints
│   │   ├── sessionController.js   # Scoped user session CRUD logic with deduplication
│   │   └── analyticsController.js # Scoped 5-metric KPI & chart aggregation
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT token verification protector
│   │   ├── validateSession.js     # Input validation middleware
│   │   └── errorHandler.js        # Centralized error handler (hides stack traces in production)
│   ├── models/
│   │   ├── User.js       # User schema (name, email, passwordHash, createdAt)
│   │   └── Session.js    # Session schema (userId, startTime, endTime, duration, device, deviceCategory, clientSessionId)
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth routing
│   │   ├── sessionRoutes.js       # /api/sessions routing (protected)
│   │   └── analyticsRoutes.js     # /api/analytics routing (protected)
│   └── services/
│       ├── analyticsService.js    # Business logic for 5 core KPIs, streaks & charts
│       └── sessionStore.js        # Dual-mode persistence adapter with clientSessionId deduplication
├── css/
│   └── style.css         # Complete responsive styles & cyber glassmorphic theme
├── js/
│   ├── auth.js           # Client-side authentication service & token manager
│   ├── api.js            # REST client with JWT Bearer header injection
│   ├── storage.js        # LocalStorage persistence manager & offline cache
│   ├── timer.js          # Live timer engine with drift-free tracking
│   ├── mobile-tracker.js # Mobile focus mode web bridge & simulation
│   ├── laptop-tracker.js # Laptop interaction & inactivity auto-pause tracker
│   ├── analytics.js      # Client-side analytics & Chart.js renderers
│   ├── cyber-bg.js       # Interactive dynamic canvas mesh background
│   └── app.js            # Main application controller & view switcher
├── index.html            # Main single-page web app with 5 core KPI cards & Auth Modal
└── README.md             # Project documentation
```

---

### REST API Reference

#### Authentication Endpoints
| Method | Endpoint | Protection | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account with hashed password | `201 Created`, `400 Bad Request` |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token | `200 OK`, `401 Unauthorized` |
| `GET` | `/api/auth/me` | Protected | Fetch current logged-in user profile | `200 OK`, `401 Unauthorized` |

#### Session Endpoints (Scoped to Authenticated User with Deduplication)
| Method | Endpoint | Protection | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/sessions` | Protected | Create or update session with `clientSessionId` deduplication | `201 Created`, `200 OK` |
| `GET` | `/api/sessions` | Protected | Retrieve study sessions for logged-in user | `200 OK`, `401 Unauthorized` |
| `GET` | `/api/sessions/:id` | Protected | Retrieve a specific session by ID | `200 OK`, `404 Not Found` |
| `PUT` | `/api/sessions/:id` | Protected | Update owned session details | `200 OK`, `404 Not Found` |
| `DELETE` | `/api/sessions/:id` | Protected | Delete a single owned session | `200 OK`, `404 Not Found` |
| `DELETE` | `/api/sessions` | Protected | Clear all sessions for logged-in user | `200 OK` |

#### Analytics & Health Endpoints
| Method | Endpoint | Protection | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/health` | Public | Server uptime and MongoDB connection state | `200 OK` |
| `GET` | `/api/analytics/summary` | Protected | Scoped aggregated 5-KPI summary (Today, Weekly, Monthly, Phone, Laptop) | `200 OK` |
| `GET` | `/api/analytics/charts` | Protected | Scoped precomputed weekly, monthly, doughnut charts | `200 OK` |

---

### Running the Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **Access the Application**:
   Open [http://localhost:5000](http://localhost:5000) in your browser.
   Sign up or sign in to track and sync focused study sessions automatically across laptop and mobile devices!

