# Lessons Learned

## Lesson 1: Firebase Admin SDK Project ID Discovery on Local Workspaces
- **Problem**: Calling `admin.initializeApp()` without credentials or an explicit `projectId` in local Node.js environments (outside Google Cloud) resulted in `Failed to determine project ID: Error while making request: getaddrinfo ENOTFOUND metadata.google.internal. Error code: ENOTFOUND`, causing token verification to fail and reject client requests with HTTP 401.
- **Root Cause**: When initialized without a service account or explicit project identifier, Firebase Admin SDK falls back to Google Application Default Credentials (ADC) and attempts to query the Google Cloud internal metadata IP (`metadata.google.internal`) to determine the active project ID.
- **Prevention**: Always pass `projectId: process.env.FIREBASE_PROJECT_ID || '<default-project-id>'` directly in `admin.initializeApp(...)`. Additionally, wrap database enrichment in auth middlewares in a localized `try...catch` so unexpected database connectivity delays never invalidate a valid, verified Firebase ID token.

## Lesson 2: Firebase Realtime Database Security Rules for Client Realtime Subscriptions
- **Problem**: When loading user profile and courses, the browser console reported `permission_denied at /users/<uid>: Client doesn't have permission to access the desired data.` and uncaught promise rejections from `get()` and `onValue()`.
- **Root Cause**: Firebase Realtime Database defaults to locked rules (`.read: false`, `.write: false`), which block client SDK queries. Additionally, invoking `onValue()` without an error callback throws an uncaught exception in the browser when permission is rejected.
- **Prevention**: Maintain a project `database.rules.json` that grants read access (`.read: "auth != null"`) to authenticated clients for realtime data while keeping direct writes restricted. Always pass an error callback `(error) => console.warn(...)` as the second/third parameter to Firebase client `onValue` and attach `.catch()` to `get()` promises.

## Lesson 3: Firebase Storage Security Rules and Upload Error Swallowing
- **Problem**: Uploading material files threw `Firebase Storage: User does not have permission... (storage/unauthorized)` followed by `TypeError: Cannot read properties of undefined (reading 'URL')`.
- **Root Cause**: Default Firebase Storage security rules disallow client write operations. In helper functions, wrapping upload routines with `try...catch` without re-throwing caused `undefined` to be returned to callers expecting `{ snapshot, URL }`, resulting in a secondary `TypeError`.
- **Prevention**: Define explicit `storage.rules` scoping user uploads to `materials/{userId}/...`. Helper functions that perform asynchronous I/O must re-throw caught errors so callers receive the original, actionable exception rather than failing silently or causing property access errors on `undefined`.

## Lesson 4: Query String Cache-Busting on Pre-Signed or Tokenized URLs
- **Problem**: In `MaterialEditor.jsx`, fetching DOCX files threw HTTP 403 Forbidden: `Failed to fetch DOCX file`.
- **Root Cause**: In `materialUtils.js`, `fetchAndConvertDocxToHtml` naively appended `?t=${Date.now()}` to `fileURL`. Because Firebase Storage download URLs already contain a query string (`?alt=media&token=<token_uuid>`), appending a second `?` broke the `token` parameter (`token=<uuid>?t=<timestamp>`), causing Google Cloud Storage to reject the request as unauthorized.
- **Prevention**: When appending query parameters such as cache busters to arbitrary URLs, always test `url.includes('?')` and use `&` if parameters already exist, or use the standard `new URL(urlString)` API.


