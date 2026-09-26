# Fi-API — Backend Service for Fi-Study

Fi-API is a modular, high-performance Node.js & Express RESTful API that handles business logic, database mutations (Create, Update, Delete), authentication verification, and OpenRouter AI quiz generation for the Fi-Study platform.

## Architecture

- **Framework**: Express.js
- **Database & Auth**: Firebase Admin SDK (Firebase Realtime Database, Firebase Authentication, Firebase Storage)
- **Rate Limiting**: Sliding-window in-memory limiter with auto-pruning (public, general API, and strict AI limits)
- **Caching**: Native `Map`-based in-memory cache with configurable TTL and auto-pruning background worker (User profiles: 5m, Courses: 2m, AI Quizzes: 24h)
- **Logging**: Request-level tracking and mutating CUD audit logging (`logs/access.log`, `logs/audit.log`)
- **AI Integration**: OpenRouter Chat Completions for AI-powered multi-choice quiz generation with response schema enforcement

## Folder Structure

```
Fi-API/
├── src/
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK initialization
│   ├── controllers/             # Controller layer (HTTP handlers)
│   ├── middlewares/             # Auth, Rate limiting, Error & Logger middlewares
│   ├── routes/                  # API endpoints definition
│   ├── services/                # Business logic, DB operations, AI logic & Caching
│   ├── utils/                   # ApiError, ApiResponse, asyncHandler, sanitize
│   ├── app.js                   # Express application setup
│   └── server.js                # Server entry point
├── logs/                        # Generated log files
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in:
- `PORT` (default 5000)
- `FIREBASE_DATABASE_URL`
- `FIREBASE_STORAGE_BUCKET`
- `OPENROUTER_API_KEY`
- Firebase Admin credentials (either place `serviceAccountKey.json` in the root of `Fi-API` or set `FIREBASE_CLIENT_EMAIL` & `FIREBASE_PRIVATE_KEY`).

### 3. Start Development Server
```bash
npm run dev
```

### 4. Production Start
```bash
npm start
```

## API Endpoints

All endpoints under `/api` except `/api/health` require:
`Authorization: Bearer <Firebase_ID_Token>`

- `GET /api/health` — Health check
- `GET /api/courses` — List user courses
- `POST /api/courses` — Create a course
- `GET /api/courses/:courseUID` — Get course details
- `PUT /api/courses/:courseUID` — Update a course
- `DELETE /api/courses/:courseUID` — Delete a course & cascade storage
- `GET /api/courses/:courseUID/lessons` — List lessons in course
- `POST /api/courses/:courseUID/lessons` — Create lesson (auto-updates counters)
- `PUT /api/courses/:courseUID/lessons/:lessonUID` — Update lesson
- `DELETE /api/courses/:courseUID/lessons/:lessonUID` — Delete lesson (auto-updates counters)
- `GET /api/courses/:courseUID/lessons/:lessonUID/materials` — List materials
- `POST /api/courses/:courseUID/lessons/:lessonUID/materials` — Create material
- `PUT /api/courses/:courseUID/lessons/:lessonUID/materials/:materialUID` — Update material
- `PATCH /api/courses/:courseUID/lessons/:lessonUID/materials/:materialUID/progress` — Mark passed / update progress
- `DELETE /api/courses/:courseUID/lessons/:lessonUID/materials/:materialUID` — Delete material & file
- `GET /api/users/profile` — Get authenticated user's profile
- `PUT /api/users/profile` — Update user profile
- `POST /api/quiz/generate` — Generate AI quiz via OpenRouter (Strict rate limit & cached)
