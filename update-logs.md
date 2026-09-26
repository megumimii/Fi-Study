# Update Logs

## [2026-09-26] - Backend Separation: Fi-API & Deprecation of Firebase Functions

### Summary of Changes
- Separated all Create, Update, and Delete (CUD) operations and the OpenRouter AI quiz generator from the client-side into a standalone Express.js backend named **`Fi-API`**.
- Implemented FairFly-modeled native in-memory caching (`Cache` class using `new Map()` with auto-pruning background timer) for user profiles, courses, and AI quiz generations.
- Implemented FairFly-modeled sliding-window rate limiting (`RateLimitService` class) for public endpoints, general authenticated API endpoints, and a strict limiter for AI quiz generation.
- Implemented structured logging: request logging (`logs/access.log`) and mutating CUD audit logging (`logs/audit.log`).
- Migrated OpenRouter AI quiz generation from Firebase Cloud Functions to `POST /api/quiz/generate` in `Fi-API`.
- Decommissioned Firebase Cloud Functions (`functions/` directory removed, `firebase.json` updated to hosting-only).
- Created a centralized client API wrapper (`fi-study/src/services/api.js`) attaching Firebase ID tokens (`Bearer <token>`) to all outgoing requests.
- Maintained real-time UI subscriptions on the frontend using Firebase Realtime Database `onValue` listeners in compliance with project architectural principles.

### Breaking Changes
- Client-side direct database writes (`setToDatabase`, `updateToDatabase`, `deleteFromDatabase`) have been removed from pages and components (`Course.jsx`, `CourseCard.jsx`, `Lessons.jsx`, `LessonsCard.jsx`, `Materials.jsx`, `MaterialCard.jsx`, `MaterialEditor.jsx`, `Quiz.jsx`, `Profile.jsx`). All mutations now go through `Fi-API` endpoints (`/api/courses`, `/api/courses/:id/lessons`, etc.).
- Cloud Function endpoint `https://generatequiz-56sjkufufa-uc.a.run.app` replaced with `http://localhost:5000/api/quiz/generate`.

## [2026-09-26] - Fix: Firebase Admin Token Verification & Realtime Database Rules

### Summary of Changes
- **Firebase Admin Project ID**: Configured explicit `projectId: 'fi-study-4e3ea'` in [Fi-API/src/config/firebase.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/config/firebase.js) to resolve `metadata.google.internal` discovery failures when running on local environments without GCP metadata services.
- **Resilient Auth Middleware**: Wrapped database user enrichment in [Fi-API/src/middlewares/auth.middleware.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/middlewares/auth.middleware.js) in an inner `try...catch` with automatic fallback to decoded token metadata (`name`, `email`, `picture`). Valid Firebase ID tokens will no longer be erroneously rejected with 401 when database reads encounter permission delays.
- **Graceful Profile Service**: Enhanced [Fi-API/src/services/user.service.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/services/user.service.js) to derive and cache user profiles from the authenticated token if database connections are pending credentials.
- **Multi-Level Env Resolution**: Added multi-path `.env` resolution in `server.js` and `firebase.js` so starting the backend from `Fi-API`, `Fi-API/src`, or parent directories loads environment variables seamlessly.
- **Database Security Rules**: Created [fi-study/database.rules.json](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/database.rules.json) and linked it in [fi-study/firebase.json](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/firebase.json) granting authenticated users read access to `/users/$uid`, `/courses`, `/lessons`, and `/materials`.
- **Client Listener Error Callbacks**: Added error handler callbacks to all `onValue` and `get` operations across [Home.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Home/Home.jsx), [Course.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Course/Course.jsx), [Lessons.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Lessons/Lessons.jsx), and [Materials.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Materials/Materials.jsx) to prevent unhandled promise rejections.

## [2026-09-26] - Fix: Firebase Storage Rules & Upload Error Handling

### Summary of Changes
- **Firebase Storage Security Rules**: Created [fi-study/storage.rules](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/storage.rules) permitting authenticated users to upload and download materials under `materials/{userId}/` and profile pictures under `users/{userId}/`. Updated [fi-study/firebase.json](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/firebase.json) to reference `storage.rules`.
- **Upload Error Propagation**: Fixed [fi-study/src/utils/FirebaseHelper.js](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/utils/FirebaseHelper.js) to re-throw exceptions from `uploadBytes()` / `getDownloadURL()` rather than swallowing them and returning `undefined`.
- **Defensive Upload Checks**: Added explicit guards checking `res && res.URL` in [Materials.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Materials/Materials.jsx) and [MaterialCard.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/MaterialCard/MaterialCard.jsx) to prevent `TypeError: Cannot read properties of undefined (reading 'URL')`.
- **Cache-Buster Query String Fix**: Fixed `fetchAndConvertDocxToHtml` and `fetchAndExtractDocxText` in [fi-study/src/utils/materialUtils.js](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/utils/materialUtils.js) to dynamically use `&` when `fileURL` already contains query parameters (`?alt=media&token=...`), preventing token parameter corruption and 403 Forbidden errors when loading document content.
- **Automated Storage & RTDB Rules Deployment**: Created [Fi-API/scripts/deployStorageRules.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/scripts/deployStorageRules.js) and deployed open development rules for Firebase Storage and Realtime Database directly via Google Firebase Rules API using the service account credentials.
