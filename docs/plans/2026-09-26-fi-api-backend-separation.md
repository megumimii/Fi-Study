# Fi-API Backend Separation & Architecture Implementation Plan

> **For Claude / Agent Execution:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Decouple all Create, Update, and Delete (CUD) database operations and the OpenRouter AI quiz generation from client-side Firebase calls into a secure, modular Node.js/Express backend (`Fi-API`) powered by Firebase Admin SDK, featuring rate limiting, in-memory caching, and structured logging.

**Architecture:** A layered MVC/Clean Architecture Express service located at `/Fi-API`, containing strict separation of routes, middlewares, controllers, services, validations, and utilities. Client-side React app communicates with `Fi-API` using Firebase ID tokens (`Bearer <token>`) for all CUD operations and AI requests, while retaining reactive Firebase Realtime Database listeners (`onValue`) for real-time data display as mandated by the project standards.

**Tech Stack:**
- **Backend (`Fi-API`):** Node.js, Express.js (v4), Firebase Admin SDK (`firebase-admin`), Native In-Memory Auto-Pruning Cache & Sliding-Window Rate Limiter (modeled on FairFly's `cacheService.js` and `rateLimitService.js`), `cors`, `dotenv`, `axios`
- **Frontend (`fi-study`):** React 19, Vite, Firebase Web SDK (Auth & RTDB listeners), centralized API client service (`src/services/api.js`)

---

## 1. System Architecture & Directory Layout

### 1.1 Backend Directory Tree (`/Fi-API`)
```
Fi-API/
├── src/
│   ├── config/
│   │   ├── env.js                     # Environment variable validation & exports
│   │   └── firebase.js                # Firebase Admin SDK initialization & DB/Auth exports
│   ├── controllers/                   # Request/Response handling & parameter extraction
│   │   ├── course.controller.js
│   │   ├── lesson.controller.js
│   │   ├── material.controller.js
│   │   ├── user.controller.js
│   │   └── quiz.controller.js
│   ├── services/                      # Core business logic & database/AI calls
│   │   ├── course.service.js
│   │   ├── lesson.service.js
│   │   ├── material.service.js
│   │   ├── user.service.js
│   │   └── quiz.service.js
│   ├── routes/                        # Express route definitions with middleware bindings
│   │   ├── index.js                   # Aggregate router mounting /api/...
│   │   ├── course.routes.js
│   │   ├── lesson.routes.js
│   │   ├── material.routes.js
│   │   ├── user.routes.js
│   │   └── quiz.routes.js
│   ├── middlewares/                   # Interceptors & policy enforcement
│   │   ├── auth.middleware.js         # Verifies Firebase ID Token (`Bearer <token>`)
│   │   ├── rateLimiter.middleware.js  # Global & endpoint-specific rate limiters
│   │   ├── cache.middleware.js        # Route caching & cache invalidation helpers
│   │   ├── validate.middleware.js     # Zod schema validation middleware
│   │   ├── error.middleware.js        # Global error & 404 handler
│   │   └── logger.middleware.js       # Morgan HTTP request logger integration
│   ├── utils/                         # Reusable helpers
│   │   ├── logger.js                  # Winston logger configuration (console + file)
│   │   ├── cache.js                   # NodeCache singleton instance & helpers
│   │   ├── apiResponse.js             # Consistent API success response formatter
│   │   ├── apiError.js                # Custom ApiError class with HTTP status codes
│   │   ├── asyncHandler.js            # Wrapper catching async route errors
│   │   └── sanitize.js                # Input sanitization utility
│   ├── validations/                   # Zod schemas for input validation
│   │   ├── course.validation.js
│   │   ├── lesson.validation.js
│   │   ├── material.validation.js
│   │   ├── user.validation.js
│   │   └── quiz.validation.js
│   ├── app.js                         # Express app setup, CORS, and middleware stack
│   └── server.js                      # Server startup & graceful shutdown
├── logs/                              # Generated Winston log files
├── .env.example                       # Documented required environment variables
├── .gitignore
├── package.json
└── README.md                          # API documentation, setup, and run instructions
```

---

## 2. API Contract Specification

All endpoints (except health check) require the header `Authorization: Bearer <Firebase_ID_Token>`.
The `auth.middleware.js` decodes the token and attaches `req.user = { uid, email, ... }`.

### 2.1 Course Endpoints
- **`GET /api/courses`**: Fetch all courses for authenticated user (cached in memory per user).
- **`POST /api/courses`**: Create a new course (body: `{ title, description, color }`).
- **`PUT /api/courses/:courseUID`**: Update course details (body: `{ title, description, color }`).
- **`DELETE /api/courses/:courseUID`**: Delete course, cascade delete nested lessons & storage folder.

### 2.2 Lesson Endpoints
- **`GET /api/courses/:courseUID/lessons`**: Get lessons for a course.
- **`POST /api/courses/:courseUID/lessons`**: Create a lesson (body: `{ title, description }`), auto-increments course `totalLessons`.
- **`PUT /api/courses/:courseUID/lessons/:lessonUID`**: Update lesson (body: `{ title, description }`).
- **`DELETE /api/courses/:courseUID/lessons/:lessonUID`**: Delete lesson, cleans storage, auto-decrements course `totalLessons`.

### 2.3 Material Endpoints
- **`GET /api/courses/:courseUID/lessons/:lessonUID/materials`**: Get materials for a lesson.
- **`POST /api/courses/:courseUID/lessons/:lessonUID/materials`**: Create material record (body: `{ title, description, fileURL?, fileName? }`).
- **`PUT /api/courses/:courseUID/lessons/:lessonUID/materials/:materialUID`**: Update material record & metadata (body: `{ title, description, fileURL?, fileName?, htmlContent? }`).
- **`PATCH /api/courses/:courseUID/lessons/:lessonUID/materials/:materialUID/progress`**: Update `passed` flag when quiz is completed. Automatically triggers lesson & course completion recalculations.
- **`DELETE /api/courses/:courseUID/lessons/:lessonUID/materials/:materialUID`**: Delete material record and associated Firebase Storage file.

### 2.4 User Profile Endpoints
- **`GET /api/users/profile`**: Get current user profile.
- **`PUT /api/users/profile`**: Update profile names or picture URLs (body: `{ firstName?, lastName?, profilePicture?, coverPicture? }`).

### 2.5 Quiz Generation (OpenRouter AI)
- **`POST /api/quiz/generate`**:
  - Protected with strict rate limit (e.g., 10 req / 5 min).
  - Body: `{ materialText }` (min 500 chars).
  - Caches quiz by SHA-256 hash of `materialText` to save OpenRouter credits and reduce latency.
  - Calls OpenRouter Chat Completions (`nvidia/nemotron-nano-12b-v2-vl:free` or configured model) and returns strictly formatted JSON quiz questions.

---

## 3. Phased Implementation Tasks

### Phase 1: Backend Foundation & Infrastructure (`Fi-API`)

#### Task 1: Initialize `Fi-API` Node Project
- **Files:**
  - Create: `Fi-API/package.json`
  - Create: `Fi-API/.gitignore`
  - Create: `Fi-API/.env.example`
- **Actions:**
  - Initialize project with dependencies: `express`, `firebase-admin`, `express-rate-limit`, `node-cache`, `winston`, `morgan`, `zod`, `cors`, `dotenv`, `axios`.
  - Dev dependencies: `nodemon`.
  - Set up standard npm scripts (`start`, `dev`).

#### Task 2: Core Utilities & Logging (`utils/` & `config/`)
- **Files:**
  - Create: `Fi-API/src/utils/logger.js` (Winston logger with console & file rotation)
  - Create: `Fi-API/src/utils/apiResponse.js` (Standardized success response: `{ success: true, data, message }`)
  - Create: `Fi-API/src/utils/apiError.js` (Custom error class with status codes)
  - Create: `Fi-API/src/utils/asyncHandler.js` (Async route error wrapper)
  - Create: `Fi-API/src/utils/cache.js` (Node-cache instance with TTL & key helpers)
  - Create: `Fi-API/src/utils/sanitize.js` (Server-side string sanitization)
  - Create: `Fi-API/src/config/env.js` (Environment variable loader & defaults)
  - Create: `Fi-API/src/config/firebase.js` (Firebase Admin SDK initialization for RTDB, Auth, and Storage)

#### Task 3: Middlewares Stack
- **Files:**
  - Create: `Fi-API/src/middlewares/auth.middleware.js`: Extracts `Bearer <token>`, validates via `admin.auth().verifyIdToken(token)`, attaches `req.user`.
  - Create: `Fi-API/src/middlewares/rateLimiter.middleware.js`:
    - `apiLimiter`: 100 requests per 15 minutes.
    - `quizLimiter`: 10 requests per 5 minutes per user/IP.
  - Create: `Fi-API/src/middlewares/cache.middleware.js`: Transparent route cache lookup and invalidation dispatch.
  - Create: `Fi-API/src/middlewares/validate.middleware.js`: Zod schema validation interceptor.
  - Create: `Fi-API/src/middlewares/error.middleware.js`: Catches unhandled errors, formats clean response, logs stack traces.
  - Create: `Fi-API/src/middlewares/logger.middleware.js`: Morgan stream piped to Winston logger.

#### Task 4: Express App & Server Bootstrap
- **Files:**
  - Create: `Fi-API/src/app.js`: Configures CORS, express.json, Morgan logger, global rate limit, and route mounts.
  - Create: `Fi-API/src/server.js`: Listens on `PORT` (default 5000), adds graceful shutdown listeners.

---

### Phase 2: Domain Services & Controllers

#### Task 5: User & Profile Management
- **Files:**
  - Create: `Fi-API/src/validations/user.validation.js`
  - Create: `Fi-API/src/services/user.service.js`
  - Create: `Fi-API/src/controllers/user.controller.js`
  - Create: `Fi-API/src/routes/user.routes.js`
- **Actions:**
  - Implement `GET /api/users/profile` and `PUT /api/users/profile`.
  - User can only read and mutate their own profile record (`users/${uid}`).

#### Task 6: Course Management
- **Files:**
  - Create: `Fi-API/src/validations/course.validation.js`
  - Create: `Fi-API/src/services/course.service.js`
  - Create: `Fi-API/src/controllers/course.controller.js`
  - Create: `Fi-API/src/routes/course.routes.js`
- **Actions:**
  - Implement list, create, update, and delete courses under `courses/${uid}/${courseUID}`.
  - On delete, cascade remove lessons and storage files in `materials/${uid}/${courseUID}`.
  - Invalidate user course cache on create/update/delete.

#### Task 7: Lesson Management
- **Files:**
  - Create: `Fi-API/src/validations/lesson.validation.js`
  - Create: `Fi-API/src/services/lesson.service.js`
  - Create: `Fi-API/src/controllers/lesson.controller.js`
  - Create: `Fi-API/src/routes/lesson.routes.js`
- **Actions:**
  - Implement list, create, update, and delete lessons.
  - Atomically update parent course `totalLessons` and `totalCompletedLessons`.
  - On delete, cascade clean associated storage directory.

#### Task 8: Material Management & Progress Calculation
- **Files:**
  - Create: `Fi-API/src/validations/material.validation.js`
  - Create: `Fi-API/src/services/material.service.js`
  - Create: `Fi-API/src/controllers/material.controller.js`
  - Create: `Fi-API/src/routes/material.routes.js`
- **Actions:**
  - Implement create, update, delete for materials.
  - Implement `PATCH .../progress` to toggle `passed` status and automatically recalculate lesson completion status (`complete: completedMaterials === totalMaterials`) and course progress.
  - Cascade delete associated file from Firebase Storage bucket on delete.

#### Task 9: OpenRouter AI Quiz Generator Migration
- **Files:**
  - Create: `Fi-API/src/validations/quiz.validation.js`
  - Create: `Fi-API/src/services/quiz.service.js`
  - Create: `Fi-API/src/controllers/quiz.controller.js`
  - Create: `Fi-API/src/routes/quiz.routes.js`
  - Mount in: `Fi-API/src/routes/index.js`
- **Actions:**
  - Port OpenRouter call from `fi-study/functions/index.cjs` into `quiz.service.js`.
  - Add text-hash caching (MD5/SHA256) with 24-hour TTL: identical material texts hit cache instead of making repeated LLM calls.
  - Enforce strict JSON output parsing, validating schema before returning.
  - Apply `quizLimiter` rate limiting middleware.

---

### Phase 3: Frontend Refactoring & Integration (`fi-study`)

#### Task 10: Centralized Frontend API Client
- **Files:**
  - Create: `fi-study/src/services/api.js`
  - Modify: `fi-study/.env` (add `VITE_API_BASE_URL=http://localhost:5000/api`)
- **Actions:**
  - Create reusable HTTP wrapper with axios/fetch that automatically retrieves `await auth.currentUser?.getIdToken()` and attaches `Authorization: Bearer <token>`.
  - Provide domain methods: `courseApi`, `lessonApi`, `materialApi`, `userApi`, `quizApi`.

#### Task 11: Refactor Course Pages & Components
- **Files:**
  - Modify: `fi-study/src/pages/Course/Course.jsx` (replace direct DB `setToDatabase` with `courseApi.create`)
  - Modify: `fi-study/src/pages/Home/Home.jsx` (replace `setToDatabase` with `courseApi.create`)
  - Modify: `fi-study/src/components/CourseCard/CourseCard.jsx` (replace `updateToDatabase` & `deleteFromDatabase` with `courseApi.update` and `courseApi.delete`)
- **Notes:** Keep `onValue` listeners intact for real-time reactivity as required by project guidelines.

#### Task 12: Refactor Lesson Pages & Components
- **Files:**
  - Modify: `fi-study/src/pages/Lessons/Lessons.jsx` (replace direct DB `set`/`update` with `lessonApi.create`)
  - Modify: `fi-study/src/components/LessonsCard/LessonsCard.jsx` (replace DB calls with `lessonApi.update` and `lessonApi.delete`)

#### Task 13: Refactor Material Pages & Components
- **Files:**
  - Modify: `fi-study/src/pages/Materials/Materials.jsx` (use `materialApi.create`)
  - Modify: `fi-study/src/components/MaterialCard/MaterialCard.jsx` (use `materialApi.update` and `materialApi.delete`)
  - Modify: `fi-study/src/pages/MaterialEditor/MaterialEditor.jsx` (use `materialApi.update`)

#### Task 14: Refactor Quiz Page & Retire Cloud Functions
- **Files:**
  - Modify: `fi-study/src/pages/Quiz/Quiz.jsx` (replace Cloud Run URL `https://generatequiz-56sjkufufa-uc.a.run.app` with `quizApi.generateQuiz`, and update passed status via `materialApi.updateProgress`)
  - Modify: `fi-study/firebase.json` (remove functions configuration or mark deprecated)
  - Documentation: Record removal of Firebase Functions in `update-logs.md`.

#### Task 15: Refactor Profile & Registration
- **Files:**
  - Modify: `fi-study/src/pages/Profile/Profile.jsx` (use `userApi.updateProfile`)
  - Modify: `fi-study/src/utils/FirebaseHelper.js` (deprecate raw CUD functions, mark for read/storage only or redirect to API client)

---

### Phase 4: Review, Testing & Documentation

#### Task 16: Verification & Self-Review
- Test token authorization: Reject unauthorized calls with 401.
- Test rate limiting: Exceed limits and verify 429 response.
- Test caching: Verify subsequent GET requests and duplicate quiz requests hit cache.
- Test logging: Confirm `logs/combined.log` and `logs/error.log` receive structured output.
- Test end-to-end user flow: Course creation -> Lesson creation -> Material upload -> Quiz generation -> Quiz submission -> Progress update.

#### Task 17: Project Documentation
- **Files:**
  - Create: `update-logs.md` at workspace root (documenting major architectural refactor).
  - Create: `Fi-API/README.md` with setup steps, environment configuration, and API reference.

---

## 4. Definition of Done
1. `Fi-API` runs independently with `npm run dev` on port 5000.
2. All CUD operations are routed through `Fi-API` with Firebase ID token verification.
3. Real-time reads in React continue working seamlessly via Firebase RTDB `onValue`.
4. OpenRouter AI quiz generation works through `Fi-API` with caching and rate limiting.
5. Firebase Cloud Functions are completely eliminated.
6. Logging to console and log files is active.
7. `update-logs.md` is updated.
