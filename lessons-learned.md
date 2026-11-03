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


## Lesson 5: Avoiding Heavy Decorative Geometry & "Cards Inside Cards" UI Slop
- **Problem**: The initial redesign used aggressive polygon `clip-path` chamfers, loud all-caps display typography everywhere, and nested container boxes (`DPLayout` box wrapping section boxes wrapping thick-bordered cards), which made the UI feel rough and overly AI-generated.
- **Root Cause**: Relying on surface-level decorative styling (`clip-path`, thick borders, repetitive uppercase badges, and boxed containers inside containers) instead of restraining the chrome and letting typography, `1px` hairline rules, and high-density horizontal rows organize the content.
- **Prevention**: Follow the `anti-ui-slop` methodology: extract the exact Design DNA from the reference frames first, eliminate nested container boxes ("cards inside cards"), avoid `clip-path` on bordered elements (which clips CSS strokes), use subtle `1px solid rgba(255,255,255,0.07)` hairlines with `6px–8px` radii, and pair clean geometric sans-serif headings with high-signal `JetBrains Mono` telemetry.

## Lesson 6: Eliminating UI Badge Clutter, Technical Implementation Jargon, & Asymmetric Shell Margins
- **Problem**: Landing page and workspace had gratuitous badge clutter (`AI-Powered v2.4`, `ORIGINAL: DOCX`, `synced`, `MODULE`, `REPRESENTATION: DOCX // STORAGE: DOCX`), technical backend storage implementation details exposed in user-facing UI, uncentered layouts on widescreen viewports creating unbalanced margins, and missing workspace back navigation.
- **Root Cause**: Exposing internal system architecture details (e.g. canonical DOCX format sync, Firestore persistence notes) in end-user text, over-decorating headers with status pills and tags, constraining layout with `max-width` without centering (`margin: 0 auto`) or `100%` width expansion, and not preserving consistent top-level breadcrumb/back navigation across all document workspace tabs.
- **Prevention**: Always filter out internal backend/storage mechanics from user-facing copy. Adhere strictly to the `anti-ui-slop` rule: zero decorative badge pills unless conveying critical status. Ensure main layout wrappers either expand `100%` with equal symmetric padding or use `margin: 0 auto`. Maintain unified `<workspace-top-bar>` navigation containing `<span className="back-button">` and workspace tabs across all sub-views.

## Lesson 7: Infinite CSS Marquee Seamless Looping & Subpixel Jitter Elimination
- **Problem**: The technologies carousel on the Landing Page stuttered and visibly jerked upon looping rather than scrolling smoothly.
- **Root Cause**: The track was animated using a single flex container of items with `gap: 56px` translated by `translateX(-50%)`. Because flex `gap` is applied only between items and not at the outer boundary, translating by `-50%` was offset by half a gap width (`28px`), creating an abrupt jump at the loop reset. Additionally, animating with 2D `translateX` without GPU layer promotion (`translate3d`) or `will-change: transform` caused frame drops and subpixel rasterization jitter.
- **Prevention**: To create an uninterrupted, butter-smooth infinite marquee:
  1. Structure the track into two identical groups (`.frameworks-group`) side-by-side inside `#frameworks-track` (`display: flex; width: max-content; gap: 0`).
  2. Each group must have `gap: N px` and an identical `padding-right: N px`. This guarantees the distance between the last item of Group 1 and the first item of Group 2 is identical to the distance between any two items within a group, making a `-50%` reset mathematically seamless to the exact subpixel.
  3. Promote the animation to the GPU compositor thread using `transform: translate3d(0, 0, 0)` to `transform: translate3d(-50%, 0, 0)` and declare `will-change: transform`.
  4. Apply edge feathering using `mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent)` to avoid harsh cutoffs at the container boundary.
  5. Always wrap the animation inside `@media (prefers-reduced-motion: reduce)` to disable motion for sensitive users.

## Lesson 8: Avoiding Forced Two-Column Grids for Asymmetric Content & Editorial Freeing
- **Problem**: Placing "About This Site" (a short descriptive paragraph) and "Technologies Used" (a marquee carousel) side-by-side in a 2-column grid (`grid-template-columns: 1fr 1fr; align-items: stretch;`) squeezed the text into a cramped vertical column while creating a massive empty void above the carousel in the adjacent card.
- **Root Cause**: Forcing fundamentally different content structures (an editorial narrative paragraph vs. a horizontal scrolling marquee ticker) into symmetrical parallel cards with `align-items: stretch` and `justify-content: space-between`.
- **Prevention**: Follow the `anti-ui-slop` principle: do not box narrative copy into artificial cards. Free editorial content from container boxes so it can breathe directly on the canvas as an authored statement (`max-width: ~72ch`), and stack structural elements (like horizontal marquees) into clean, dedicated, full-width container rows underneath.

## Lesson 9: Quiz Submission Idempotency, Accurate Passing Thresholds, & Exit Confirmation
- **Problem**: In `Quiz.jsx`, users scoring 7/10 (70%) were erroneously marked as failed with the confusing message "Score above 7/10 required to pass". Furthermore, after closing the results modal to review answers, the "Submit Final Quiz" button remained active; clicking it repeatedly sent duplicate quiz telemetry records and redundant material progress updates to Firebase. Finally, leaving the review view lacked exit confirmation.
- **Root Cause**: The passing threshold condition was implemented as `score > 7` instead of `score >= 7` (or `score >= Math.ceil(questions.length * 0.7)`), causing 70% to fail. There was no submission idempotency state or ref guarding `handleSubmitQuiz`, allowing repeated API calls on repeated clicks. The button was not replaced after submission with an exit action.
- **Prevention**:
  1. Define explicit passing thresholds based on percentage (`score >= Math.ceil(questions.length * 0.7)`) and ensure user-facing copy consistently reflects the threshold ("Score 7/10 (70%) or higher to pass").
  2. Implement submission idempotency via a state/ref guard (`if (isQuizSubmitted || isSubmittingRef.current) return;`) so backend logging and progress updates execute strictly once on first submission.
  3. Once submitted, replace the submit button with a dual action: "View Score Summary" and "Go Back to Notes".
  4. Protect navigation away from the quiz review with a dedicated confirmation modal (`<Modal ref={exitConfirmModalRef} ...>`) so users never lose their review session unintentionally.


