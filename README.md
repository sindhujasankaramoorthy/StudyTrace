# StudyTrace — Cross-Device Study Time Tracking System

### Problem Statement

Students often find it difficult to accurately measure how much time they actually spend studying. Traditional study timers require users to manually start and stop sessions, which can be inconvenient and may lead to inaccurate records. In addition, students may switch between devices during the day—for example, using a laptop during college hours and a phone at home—making it difficult to maintain a single, continuous record of their study time.

Therefore, there is a need for a **cross-device study tracking system** that can automatically identify study sessions based on device activity or Focus/Study Mode, synchronize the recorded sessions, and provide a unified view of the student's actual focused study time.

### Abstract

**StudyTrace** is a cross-device study time tracking application designed to help students automatically monitor and analyze their focused study time. On mobile devices, the system can integrate with the phone's **Study/Focus Mode** to identify when a study session begins and ends. When the phone is unavailable, such as during college hours, StudyTrace can track active usage on a laptop or desktop device.

The recorded sessions are synchronized through a cloud-based backend, allowing users to maintain their study history across multiple devices. The application provides a dashboard containing **daily, weekly, and monthly study reports, total focused time, session history, study streaks, and graphical analytics**.

---

## Build 4: Secure User Authentication & Cross-Device Synchronization

Build 4 introduces full user authentication (Registration, Login, Logout, JWT Tokens, bcrypt Password Hashing) and strict session ownership scoping so every student's study data, streak counts, and analytics are private, secure, and automatically synchronized across devices via MongoDB Cloud.

### Tech Stack
- **Frontend**: HTML5, CSS3 (Glassmorphic Auth Modal & Cyber Visuals), Vanilla JavaScript (ES6+), Chart.js
- **Backend**: Node.js, Express.js
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & Password Hashing (`bcryptjs`)
- **Database**: MongoDB Atlas via Mongoose ODM
- **Environment Management**: `dotenv` with `.env` configuration (`JWT_SECRET`, `MONGODB_URI`)

---

### Project Structure
```text
StudyTrace/
├── .env                  # Private environment variables (PORT, MONGODB_URI, JWT_SECRET)
├── .env.example          # Environment template
├── .gitignore            # Git exclusion rules (node_modules, .env)
├── package.json          # Node project manifest & dependencies
├── server.js             # Express application entry point & static server
├── server/
│   ├── config/
│   │   └── db.js         # Mongoose connection manager with quick timeout & fallback
│   ├── controllers/
│   │   ├── authController.js      # User registration, login, & me endpoints
│   │   ├── sessionController.js   # Scoped user session CRUD logic
│   │   └── analyticsController.js # Scoped aggregated KPI & chart metrics
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT token verification protector
│   │   ├── validateSession.js     # Input validation middleware
│   │   └── errorHandler.js        # Centralized 400, 401, 404, 500 error handlers
│   ├── models/
│   │   ├── User.js       # User schema (name, email, passwordHash, createdAt)
│   │   └── Session.js    # Session schema (userId, startTime, endTime, duration, device)
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth routing
│   │   ├── sessionRoutes.js       # /api/sessions routing (protected)
│   │   └── analyticsRoutes.js     # /api/analytics routing (protected)
│   └── services/
│       ├── analyticsService.js    # Business logic for KPIs, streaks & charts
│       └── sessionStore.js        # Dual-mode data persistence adapter
├── css/
│   └── style.css         # Complete responsive styles & auth modal theme
├── js/
│   ├── auth.js           # Client-side authentication service & token manager
│   ├── api.js            # REST client with JWT Bearer header injection
│   ├── storage.js        # LocalStorage persistence manager & cache
│   ├── timer.js          # Live timer engine with drift-free tracking
│   ├── analytics.js      # Client-side analytics & Chart.js renderers
│   ├── cyber-bg.js       # Interactive dynamic canvas mesh background
│   └── app.js            # Main application controller & view switcher
├── index.html            # Main single-page web app with Auth Modal
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

#### Session Endpoints (Scoped to Authenticated User)
| Method | Endpoint | Protection | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/sessions` | Protected | Create a new study session for logged-in user | `201 Created`, `400 Bad Request` |
| `GET` | `/api/sessions` | Protected | Retrieve study sessions for logged-in user | `200 OK`, `401 Unauthorized` |
| `GET` | `/api/sessions/:id` | Protected | Retrieve a specific session by ID | `200 OK`, `404 Not Found` |
| `PUT` | `/api/sessions/:id` | Protected | Update owned session details | `200 OK`, `404 Not Found` |
| `DELETE` | `/api/sessions/:id` | Protected | Delete a single owned session | `200 OK`, `404 Not Found` |
| `DELETE` | `/api/sessions` | Protected | Clear all sessions for logged-in user | `200 OK` |

#### Analytics & Health Endpoints
| Method | Endpoint | Protection | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/health` | Public | Server uptime and MongoDB connection state | `200 OK` |
| `GET` | `/api/analytics/summary` | Protected | Scoped aggregated KPIs (Totals, Averages, Streaks) | `200 OK` |
| `GET` | `/api/analytics/charts` | Protected | Scoped precomputed weekly, monthly, doughnut charts | `200 OK` |

---

### Running the Application

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Production Server**:
   ```bash
   npm start
   ```

3. **Access the App**:
   Open [http://localhost:5000](http://localhost:5000) in your browser.
   Sign up or sign in to synchronize your study session history across devices in real time via MongoDB Cloud!
