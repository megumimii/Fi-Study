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


## [2026-11-03] - UI/UX Redesign ("Tactical Urban Futurism"), Multi-Format Document Engine (Tiptap), & AI Flashcard Generator

### Summary of Changes
- **Visual Identity & Design System ("Tactical Urban Futurism")**:
  - Redesigned the entire platform inspired by Japanese futuristic game interfaces (*Zenless Zone Zero*) with a high-contrast charcoal black palette (`#08090C` / `#0E1016`), bright desaturated blue accent (`#4A8BDF` / `#6BA5F2`), and off-white typography (`#F2F5F8`) in [fi-study/src/index.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/index.css).
  - Configured geometric display (`Chakra Petch`), body (`Plus Jakarta Sans`), and technical monospace (`JetBrains Mono`) fonts in [fi-study/index.html](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/index.html).
  -Redesigned the Landing Page ([LandingPage.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LandingPage/LandingPage.jsx)) with **Framer Motion** entrance/scroll animations, asymmetric telemetry framing, and reduced-motion accessibility support while preserving all original sections.
  - Redesigned all authenticated views (`DashboardSideBar`, `DashboardNavBar`, `Header`, `Home`, `Course`, `Lessons`, `Materials`, `MaterialEditor`, `Quiz`, `Flashcards`, and `Profile`) and replaced emoji status markers with crisp Material Symbols icons.
- **Reusable UI Primitives & Hooks**:
  - Created [useDebounce.js](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/hooks/useDebounce.js) and [useReducedMotionSafe.js](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/hooks/useReducedMotionSafe.js).
  - Created modular UI components under `src/components/ui/`: [SearchBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/ui/SearchBar/SearchBar.jsx), [FilterChips.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/ui/FilterChips/FilterChips.jsx), [StatusBadge.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/ui/StatusBadge/StatusBadge.jsx), [FileDropzone.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/ui/FileDropzone/FileDropzone.jsx), and [MaterialWorkspaceNav.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/ui/MaterialWorkspaceNav/MaterialWorkspaceNav.jsx).
- **Expanded File Upload Support & Canonical `.docx` Storage**:
  - Added support for `.docx`, `.pdf`, `.txt`, and `.md` uploads up to 15 MB with strict validation in [fileValidator.js](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/services/fileValidator.js).
  - Built multi-format document extraction in [documentParser.js](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/services/documentParser.js) using `mammoth` (DOCX), `pdfjs-dist` (PDF heading/list/paragraph structure extraction), `marked` (Markdown), and plain-text parsing, sanitized with `DOMPurify`.
  - Implemented canonical `.docx` storage and original-extension download conversion in [documentExporter.js](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/services/documentExporter.js): all uploaded/edited files are stored in Firebase Storage as `.docx`, retain their original extension representation (`originalExtension`: `'docx' | 'pdf' | 'md' | 'txt'`), and convert back to their original extension (`.pdf` via `jsPDF`, `.md`, `.txt`, or `.docx`) when downloaded to the user's device.
- **Tiptap Rich Text Editor**:
  - Replaced CKEditor 5 with a modular **Tiptap (ProseMirror)** editor ([RichTextEditor.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Editor/RichTextEditor.jsx), [EditorToolbar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Editor/EditorToolbar.jsx), [EditorStatusBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Editor/EditorStatusBar.jsx)).
  - Added support for creating and editing blank study notes without an initial file upload, and automatically disabled image insertion for `.txt` materials.
- **AI-Powered Flashcard Generator**:
  - Added `POST /api/flashcards/generate` in `Fi-API` ([flashcard.service.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/services/flashcard.service.js), [flashcard.controller.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/controllers/flashcard.controller.js), [flashcard.routes.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/routes/flashcard.routes.js)) and extended [material.service.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/services/material.service.js) to persist `flashcards`, `htmlContent`, and `originalExtension`.
  - Built the interactive Flashcards workspace ([Flashcards.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Flashcards/Flashcards.jsx), [FlashcardStage.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Flashcard/FlashcardStage.jsx), [FlashcardControls.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Flashcard/FlashcardControls.jsx), [FlashcardList.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Flashcard/FlashcardList.jsx), [FlashcardEditModal.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Flashcard/FlashcardEditModal.jsx)) with card count selection, 3D/spring card flip, keyboard navigation, deck shuffling, card editing/addition/deletion, cloud deck persistence, and material completion progress tracking (`passed: true` upon completing deck review).

### Breaking Changes
- Removed `@ckeditor/ckeditor5-build-classic` and `@ckeditor/ckeditor5-react` in favor of `@tiptap/react` and modular Tiptap extensions.


## [2026-11-03] - Anti-UI-Slop Minimalist Techy Redesign, Real-Time Telemetry Dashboard, & Pomodoro Timer

### Summary of Changes
- **Anti-UI-Slop Minimalist Techy Design System**:
  - Applied the `anti-ui-slop` methodology to extract the exact Design DNA from the StudyFlow reference frames: replaced heavy chamfered `clip-path` polygons and nested container boxes ("cards inside cards") with a whispered `1px solid rgba(255,255,255,0.07)` hairline architecture on a deep obsidian-slate canvas (`#0B110F` / `#0F1715`) with tech lime-green (`#A3E635`) and multi-color subject indicators in [index.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/index.css).
  - Rebuilt the authenticated shell ([DashboardSideBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DashboardSideBar/DashboardSideBar.jsx), [Header.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Header/Header.jsx), [dp-layout.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DPLayout/dp-layout.css)) with a compact `216px` sidebar featuring bottom user avatar/identity telemetry and a `52px` top status bar with live `● synced` and streak (`Xd`) readouts.
  - Transformed [Courses](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Course/Course.jsx), [Lessons](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Lessons/Lessons.jsx), and [Materials](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Materials/Materials.jsx) from bulky cards into connected horizontal table-list rows ([CourseCard.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/CourseCard/CourseCard.jsx), [LessonsCard.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/LessonsCard/LessonsCard.jsx), [MaterialCard.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/MaterialCard/MaterialCard.jsx)) with `3px` subject color bars, `JetBrains Mono` word/item counts, formatted dates, and inline filter pills.
- **Real-Data Telemetry Dashboard (Zero Mock/Seed Data)**:
  - Rebuilt [Home.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Home/Home.jsx) and [WeeklyActivityChart.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Dashboard/WeeklyActivityChart.jsx) to compute all metrics (`TOTAL HRS`, `THIS WEEK`, `QUIZ AVG`, `STREAK`, `NOTES`, `TOP SUBJECT`, the `Mon`–`Sun` `Study Hours` SVG curve, `RECENT NOTES`, `TIME BY SUBJECT`, and `RECENT QUIZZES`) 100% from the user's real Firebase Realtime Database nodes (`courses/${uid}`, `users/${uid}/studySessions`, and `users/${uid}/quizHistory`).
- **Pomodoro Focus Timer & Backend Telemetry Endpoints**:
  - Built [PomodoroTimer.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Dashboard/PomodoroTimer.jsx) with a circular SVG progress ring, `Focus (25m)` / `Short Break (5m)` / `Long Break (15m)` modes, course attribution selector, and real-time `Today` / `Sessions` / `Streak` readouts.
  - Added `POST /api/users/study-sessions` and `POST /api/users/quiz-attempts` in [user.service.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/services/user.service.js), [user.controller.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/controllers/user.controller.js), and [user.routes.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/routes/user.routes.js), and connected [Quiz.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Quiz/Quiz.jsx) to log completed quiz scores.
- **Lessons Learned**:
  - Added Lesson 5 to [lessons-learned.md](file:///c:/Users/Isaac/Documents/Fi-Study/lessons-learned.md) documenting the root cause and prevention of heavy decorative geometry and nested container slop.

## [2026-11-03] - Color Scheme Reversion to Original Blue & Navigation Cleanup

### Summary of Changes
- **Color Scheme Reversion**:
  - Reverted primary accent colors from lime green back to the original **Bright Desaturated Blue** (`--accent-primary: #4a8bdf`, `--accent-bright: #6ba5f2`, `--accent-deep: #2563eb`, `--border-accent: rgba(74, 139, 223, 0.38)`) across [fi-study/src/index.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/index.css).
  - Maintained the clean **Charcoal Black** surfaces (`--bg-canvas: #08090c`, `--bg-surface-1: #0e1118`, `--bg-surface-2: #141824`, `--bg-surface-3: #1c2233`, `--bg-elevated: #111520`).
  - Updated [WeeklyActivityChart.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Dashboard/WeeklyActivityChart.jsx) SVG curve strokes, gradient fill, and node markers to `#4a8bdf`.
  - Updated default course creation colors, fallback subject indicators, and filter chip dots across [Home.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Home/Home.jsx), [Course.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Course/Course.jsx), and [FilterChips.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/ui/FilterChips/FilterChips.jsx).
  - Replaced legacy hardcoded green canvas codes in [dashboard-sidebar.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DashboardSideBar/dashboard-sidebar.css), [dashboard-navbar.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DashboardNavBar/dashboard-navbar.css), [landing-page-footer-bar.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/LandingPageFooterBar/landing-page-footer-bar.css), and [login-page.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LoginRegisterPage/login-page.css) with CSS variables.
  - Updated default avatar styling in [Fi-API/src/services/user.service.js](file:///c:/Users/Isaac/Documents/Fi-Study/Fi-API/src/services/user.service.js) to `background=10141e&color=4A8BDF`.
- **Navigation Cleanup**:
  - Removed the **Settings** tab and its link from the sidebar in [DashboardSideBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DashboardSideBar/DashboardSideBar.jsx).
  - Verified navigation across desktop sidebar and mobile navigation drawer in [DashboardNavBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DashboardNavBar/DashboardNavBar.jsx) retains only Dashboard, My Courses, Profile, and Sign Out.

## [2026-11-04] - Persistent Pomodoro Bottom Bar, Official Logo, Jargon Removal, Equal Margins, & Anti-UI-Slop Landing Page

### Summary of Changes
- **Persistent Pomodoro Bottom Bar ("Music Control Bar" Pattern)**:
  - Created [PomodoroContext.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/context/PomodoroContext.jsx) lifting timer and telemetry state to the dashboard application shell.
  - Built [PomodoroBottomBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Dashboard/PomodoroBottomBar.jsx) and [pomodoro-bottom-bar.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Dashboard/pomodoro-bottom-bar.css), permanently visible across all authenticated pages (`/main/*`) with top hairline progress strip, session title, mode buttons, restart, play/pause, digital clock readout, and log button.
  - Removed the course/lesson select dropdown from [PomodoroTimer.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Dashboard/PomodoroTimer.jsx) as requested, synchronizing the dashboard widget with `usePomodoro()`.
  - Added bottom padding clearance in [dashboard-page.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/DashboardPage/dashboard-page.css) so page content never collides with the bar.
- **Official Fi-Study Logo Integration**:
  - Replaced generic `description` placeholder icons with [fi-study-logo.png](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/assets/fi-study-logo.png) in [DashboardSideBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DashboardSideBar/DashboardSideBar.jsx), [DashboardNavBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DashboardNavBar/DashboardNavBar.jsx), [LandingPageNavBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/LandingPageNavBar/LandingPageNavBar.jsx), and [LandingPageFooterBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/LandingPageFooterBar/LandingPageFooterBar.jsx).
- **Note Editor Navigation & Jargon Cleanup**:
  - Added Back Navigation button (`Back to Materials`) in [MaterialEditor.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/MaterialEditor/MaterialEditor.jsx) inside a standardized `.workspace-top-bar`.
  - Removed irrelevant storage and format jargon across the application: removed `REPRESENTATION: DOCX // STORAGE: DOCX` from [EditorStatusBar.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Editor/EditorStatusBar.jsx), removed canonical storage upload notes from [FileDropzone.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/ui/FileDropzone/FileDropzone.jsx), [MaterialEditor.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/MaterialEditor/MaterialEditor.jsx), and [Materials.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Materials/Materials.jsx).
  - Removed the `synced` status pill and slash divider from [Header.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/Header/Header.jsx).
- **Layout Margin Equalization**:
  - Fixed [dp-layout.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/DPLayout/dp-layout.css) to use `width: 100%; max-width: 100%;` with symmetric `28px` padding, ensuring left and right margins are strictly equal across widescreen viewports and align with the top header.
- **Anti-UI-Slop Landing Page Overhaul with Abstract Harmonic Field**:
  - Removed all decorative UI badges and pills (`hero-status-pill`, `showcase-tag`, `01 · MODULE`) across [LandingPage.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LandingPage/LandingPage.jsx) and [FeatureCard.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/FeatureCard/FeatureCard.jsx).
  - Built [HeroAbstractArt.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/LandingPage/HeroAbstractArt.jsx) and [hero-abstract-art.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/components/LandingPage/hero-abstract-art.css) implementing an interactive 64-line harmonic wave interference field.
  - Restructured the Hero into a full-width high-contrast architectural split with bold sans-serif typography, a 3-bullet checklist, dual CTAs, and the abstract line field.
- **Lessons Learned**:
  - Added Lesson 6 to [lessons-learned.md](file:///c:/Users/Isaac/Documents/Fi-Study/lessons-learned.md) covering badge clutter removal, storage detail omission, and widescreen layout margin symmetry.

## [2026-11-04] - Fix: Smooth Hardware-Accelerated Infinite Technologies Marquee on Landing Page

### Summary of Changes
- **Dual-Group Infinite Track Architecture**:
  - Re-architected the technologies marquee in [LandingPage.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LandingPage/LandingPage.jsx) into two identical `.frameworks-group` elements within `#frameworks-track`.
  - Expanded `MARQUEE_ITEMS` to repeated trios of `TECH_LOGOS` so the single-group width comfortably exceeds maximum viewport and container dimensions, preventing premature wrapping on ultrawide monitors.
- **Subpixel Translation & Spacing Alignment**:
  - In [landing-page.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LandingPage/landing-page.css), matched `.frameworks-group`'s `gap: 48px` with an identical `padding-right: 48px`, guaranteeing the inter-item spacing across the group boundary is exact to the pixel.
  - Replaced 2D `translateX` with GPU compositor-promoted `transform: translate3d(0, 0, 0)` to `transform: translate3d(-50%, 0, 0)` and added `will-change: transform` to eliminate paint recalculations and subpixel rasterization jumps.
  - Softened the container boundaries using CSS `-webkit-mask-image` and `mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)` for gentle edge feathering.
  - Added hover pause (`animation-play-state: paused`) and accessibility support under `@media (prefers-reduced-motion: reduce)`.
- **Lessons Learned**:
  - Added Lesson 7 to [lessons-learned.md](file:///c:/Users/Isaac/Documents/Fi-Study/lessons-learned.md) documenting infinite marquee math, boundary padding alignment, and GPU layer acceleration.

## [2026-11-04] - Anti-UI-Slop: Two-Row Refactor for About This Site & Tech Container

### Summary of Changes
- **Two-Row Layout Architecture**:
  - Replaced the forced two-column parallel grid in [LandingPage.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LandingPage/LandingPage.jsx) and [landing-page.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LandingPage/landing-page.css) with a natural two-row vertical sequence.
- **Box-Free Editorial for "About This Site"**:
  - Removed all card bounding boxes, borders, and nested containers from "About This Site" (`.about-editorial`).
  - Allowed the narrative statement to breathe directly on the canvas with comfortable typography, generous line-height (`1.75`), and an optimal reading measure (`max-width: 76ch`).
- **Dedicated Full-Width Container for "Technologies Used"**:
  - Placed "Technologies Used" into `#frameworks-card` with sleek hairline borders (`1px solid var(--border-subtle)`), clean surface styling, and integrated infinite marquee ticker directly beneath its header, eliminating the massive vertical void.
  - Added high-resolution transparent PNG logos for **Node.js** ([NODE-LOGO.png](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/assets/frameworks-logos/NODE-LOGO.png)) and **Express.js** ([EXPRESS-LOGO.png](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/assets/frameworks-logos/EXPRESS-LOGO.png)) to the technology marquee array in [LandingPage.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/LandingPage/LandingPage.jsx).
- **Lessons Learned**:
  - Added Lesson 8 to [lessons-learned.md](file:///c:/Users/Isaac/Documents/Fi-Study/lessons-learned.md) on avoiding forced parallel columns for asymmetric content types.

## [2026-11-04] - Fix: Quiz 70% Passing Threshold, Single-Click Submission Idempotency, & Exit Confirmation Modal

### Summary of Changes
- **Correct 70% Passing Score Threshold**:
  - Fixed passing score evaluation in [Quiz.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Quiz/Quiz.jsx) from strict `score > 7` to standard academic threshold `score >= Math.ceil(questions.length * 0.7)` (`score >= 7` for 10-question quiz).
  - Scoring 7/10 is now correctly evaluated as **Passed** (`passed: true`), and the results modal displays `Target threshold (70%+) achieved. Material marked as Passed!`.
  - Harmonized empty state description to specify "Score 7/10 (70%) or higher to mark this material as Passed".
- **Single-Click Submission Idempotency**:
  - Implemented `isQuizSubmitted` state and `isSubmittingRef` guard in [Quiz.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Quiz/Quiz.jsx).
  - Clicking the submit button records the attempt (`userApi.logQuizAttempt`) and updates material completion (`materialApi.updateProgress`) strictly on the first click.
  - Subsequent clicks immediately open the score summary modal without sending duplicate telemetry attempts to the backend or Firebase.
- **Replaced Submit Button with Exit & Score Actions**:
  - Once submitted, the "Submit Final Quiz" button is replaced with `.quiz-finish-submitted` containing a secondary "View Score Summary" button and an accent "Go Back to Notes" button.
- **Exit Confirmation Modal**:
  - Added a dedicated confirmation modal (`exitConfirmModalRef`) in [Quiz.jsx](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Quiz/Quiz.jsx) and styled it in [quiz.css](file:///c:/Users/Isaac/Documents/Fi-Study/fi-study/src/pages/Quiz/quiz.css).
  - Prompts confirmation when clicking "Go Back to Notes", "Return to Materials" from the results modal, or the top bar "Back to Materials" link, confirming that the score has been saved before navigating back.
- **Lessons Learned**:
  - Added Lesson 9 to [lessons-learned.md](file:///c:/Users/Isaac/Documents/Fi-Study/lessons-learned.md).





