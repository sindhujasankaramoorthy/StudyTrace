# StudyTrace — Cross-Device Study Time Tracking System

### Problem Statement

Students often find it difficult to accurately measure how much time they actually spend studying. Traditional study timers require users to manually start and stop sessions, which can be inconvenient and may lead to inaccurate records. In addition, students may switch between devices during the day—for example, using a laptop during college hours and a phone at home—making it difficult to maintain a single, continuous record of their study time.

Therefore, there is a need for a **cross-device study tracking system** that can automatically identify study sessions based on device activity or Focus/Study Mode, synchronize the recorded sessions, and provide a unified view of the student's actual focused study time.

### Abstract

**StudyTrace** is a cross-device study time tracking application designed to help students automatically monitor and analyze their focused study time. On mobile devices, the system can integrate with the phone's **Study/Focus Mode** to identify when a study session begins and ends. When the phone is unavailable, such as during college hours, StudyTrace can track active usage on a laptop or desktop device.

The recorded sessions are synchronized through a cloud-based backend, allowing users to maintain their study history across multiple devices. The application provides a dashboard containing **daily, weekly, and monthly study reports, total focused time, session history, study streaks, and graphical analytics**.

---

## Build 3: Production Backend & Full-Stack Architecture

Build 3 introduces a robust, production-style RESTful API built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**, featuring centralized error handling, input validation, and intelligent hybrid synchronization with offline LocalStorage fallback.

### Tech Stack
- **Frontend**: HTML5, CSS3 (Modern Glassmorphism & Cyber Wave Visuals), Vanilla JavaScript (ES6+), Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB via Mongoose ODM
- **Environment Management**: `dotenv` with `.env` configuration
- **Cross-Origin Handling**: `cors` middleware

---

### Project Structure
```text
StudyTrace/
├── .env                  # Private environment variables (PORT, MONGODB_URI)
├── .env.example          # Environment template
├── .gitignore            # Git exclusion rules (node_modules, .env)
├── package.json          # Node project manifest & dependencies
├── server.js             # Express application entry point & static server
├── server/
│   ├── config/
│   │   └── db.js         # Mongoose connection manager with quick timeout
│   ├── controllers/
│   │   ├── sessionController.js   # Session CRUD & clear logic
│   │   └── analyticsController.js # Aggregated KPI & chart metrics
│   ├── middleware/
│   │   ├── validateSession.js     # Input validation middleware
│   │   └── errorHandler.js        # Centralized 400, 404, 500 error handlers
│   ├── models/
│   │   └── Session.js    # Mongoose schema (userId, startTime, endTime, duration, device)
│   ├── routes/
│   │   ├── sessionRoutes.js       # /api/sessions routing
│   │   └── analyticsRoutes.js     # /api/analytics routing
│   └── services/
│       └── analyticsService.js    # Business logic for KPIs, streaks & charts
├── css/
│   └── style.css         # Complete responsive styles & cyber theme
├── js/
│   ├── api.js            # Frontend REST client with auto LocalStorage fallback
│   ├── storage.js        # LocalStorage persistence manager & cache
│   ├── timer.js          # Live timer engine with drift-free tracking
│   ├── analytics.js      # Client-side analytics & Chart.js renderers
│   ├── cyber-bg.js       # Interactive dynamic canvas mesh background
│   └── app.js            # Main application controller & view switcher
├── index.html            # Main single-page web app
└── README.md             # Project documentation
```

---

### REST API Reference

#### Session Endpoints
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/sessions` | Create a new completed study session | `201 Created`, `400 Bad Request` |
| `GET` | `/api/sessions` | Retrieve study sessions (supports `?filter=`, `?date=`) | `200 OK`, `500 Error` |
| `GET` | `/api/sessions/:id` | Retrieve a specific session by ID | `200 OK`, `404 Not Found` |
| `PUT` | `/api/sessions/:id` | Update session details | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `DELETE` | `/api/sessions/:id` | Delete a single session | `200 OK`, `404 Not Found` |
| `DELETE` | `/api/sessions` | Clear all sessions for a user | `200 OK` |

#### Analytics & Health Endpoints
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Server uptime and MongoDB connection state | `200 OK` |
| `GET` | `/api/analytics/summary` | Aggregated KPIs (Totals, Averages, Top Day, Streaks) | `200 OK` |
| `GET` | `/api/analytics/charts` | Precomputed weekly, monthly, and subject distributions | `200 OK` |

---

### Running the Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```
   *(Note: If MongoDB is not running, the application will still launch smoothly and operate in resilient `💾 Local Mode` via LocalStorage fallback without breaking).*

3. **Start the Production Server**:
   ```bash
   npm start
   ```
   Or for live reloading during development:
   ```bash
   npm run dev
   ```

4. **Access the App**:
   Open [http://localhost:5000](http://localhost:5000) in your browser.
   The header indicator will display `🟢 Cloud Synced (MongoDB)` when connected to your backend.
