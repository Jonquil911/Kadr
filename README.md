# Kadr — a personal movie diary

A React app for keeping track of movies and TV shows: a TMDB catalog with filters and pagination, Firebase Authentication (email/password and Google), and a personal dashboard with a library, ratings, reviews, collections, statistics and viewing history.

**Live demo:** https://&lt;user&gt;.github.io/&lt;repo&gt;/

**Stack:** React 19 · Vite · React Router 7 · TanStack Query 5 · Firebase Auth + Cloud Firestore · TMDB API · PWA (Service Worker, vite-plugin-pwa) · GitHub Pages

> The interface language is Russian.

---

## Features

### Catalog (public)
- `/` — home page: featured title of the week, trending, upcoming releases, popular TV shows, top rated movies.
- `/movie`, `/tv` — catalog with debounced search, filters by genre, year and minimum rating, sorting and pagination. All filters live in the URL, so a filtered page can be shared and the browser Back button works as expected.
- `/movie/:id`, `/tv/:id` — details page: overview, facts, cast, trailer and recommendations.

### Authentication
- `/login` — email/password sign-in and Google sign-in, plus a "Remember me" checkbox (local vs. session persistence).
- `/signup` — name, email, password and confirm password, with live validation and a password strength meter.
- `/forgot-password` — sends a password reset email.
- Sessions persist after a page refresh (Firebase persistence + `onAuthStateChanged`).
- The NavBar shows **Login / Sign up** to guests and **Profile / Logout** to signed-in users.
- Firebase error codes are translated into readable messages.

### Personal dashboard — `/profile/*` (protected)
Unauthenticated users are redirected to `/login` and sent back to the page they wanted after signing in.

| Section | What it does |
|---|---|
| Overview `/profile` | email, UID (with copy button), sign-in method, logout button, email verification, summary stats, yearly goal, recent activity |
| Library `/profile/library` | tabs (All / Watchlist / Watched / Favorites), search, type filter, sorting, pagination, quick actions |
| Reviews `/profile/reviews` | list of reviews, edit and delete |
| Collections `/profile/collections` | create, rename, set icon and description, add and remove titles, delete a collection |
| Statistics `/profile/stats` | hours watched, views per month, favorite genres, rating distribution, decades |
| History `/profile/history` | recently opened titles, remove an entry, clear history |
| Settings `/profile/settings` | name, photo, avatar color, bio, yearly goal, theme, password change, JSON data export, account deletion |

---

## Architecture

```
src/
├── firebase.js               # Firebase initialization from VITE_ environment variables
├── services/                 # all network and storage access
│   ├── tmdb.js               # TMDB requests + response normalization
│   ├── authService.js        # Firebase Auth (sign-up, sign-in, Google, logout, onAuthStateChanged, …)
│   ├── userDataService.js    # Firestore: profile, library, collections, history
│   ├── preferences.js        # the only module that touches localStorage (theme)
│   ├── queryClient.js        # TanStack Query defaults
│   └── queryKeys.js          # query key factory and cache lifetimes
├── context/
│   ├── AuthContext.jsx       # AuthProvider + useAuth
│   └── ThemeContext.jsx
├── hooks/                    # useMediaList, useMediaDetails, useLibrary, useCollections, useHistory, useAccount, useStats, …
├── utils/                    # pure helpers (formatting, validation, error messages, image URLs)
├── components/               # UI only
└── pages/                    # route pages and the dashboard
```

**Rules followed:**
- UI components never call `fetch`, Firestore or `localStorage`. They only use hooks, and the hooks call services.
- `AuthContext` tracks the user through `onAuthStateChanged`. It is wrapped in `authService.subscribeToAuthChanges`. The context exposes `user`, `initializing` (loading state), `pending`, `error`, plus `signup`, `login`, `loginWithGoogle`, `logout` and `resetPassword`.
- Routes are guarded by `ProtectedRoute` (for `/profile/*`) and `GuestRoute` (for `/login` and `/signup`).

### Firestore data model

```
users/{uid}                   profile: name, bio, yearly goal, avatar color
users/{uid}/library/{key}     title in the library: status, rating, review, favorite
users/{uid}/collections/{id}  user collections
users/{uid}/history/{key}     recently opened titles
```

`key` is `{mediaType}_{tmdbId}`, for example `movie_550`. Security rules (`firestore.rules`) allow each user to read and write only their own documents.

---

## Caching strategy

Server data is cached with **TanStack Query**. Query keys are built by a factory in `src/services/queryKeys.js` and form a hierarchy. This makes it possible to invalidate a single entry or a whole branch of the cache.

| Data | Query key | `staleTime` | Revalidation |
|---|---|---|---|
| Catalog list | `['tmdb','list',{mediaType,query,genre,year,minRating,sort,page}]` | 5 min | refetched on next use after 5 min |
| Trending / curated lists | `['tmdb','trending',type]`, `['tmdb','collection',type,list]` | 5 min | same |
| Title details | `['tmdb','details',type,id]` | 30 min | prefetched on card hover/focus |
| Genres | `['tmdb','genres',type]` | 24 h | — |
| Library | `['user',uid,'library']` | 1 min | on window focus and after every mutation |
| Collections | `['user',uid,'collections']` | 1 min | on window focus and after every mutation |
| History | `['user',uid,'history']` | 1 min | after every write or delete |
| Profile | `['user',uid,'profile']` | 1 min | after settings are saved |

Unused cache entries are garbage-collected after 10 minutes (`gcTime`). Requests that fail with 401, 403 or 404 are not retried. Other failures are retried up to twice.

### When the cache is invalidated

- **Library:** after every create/update/delete. This covers adding to the watchlist, marking as watched, favoriting, rating, writing or deleting a review, and removing a title. Each mutation:
  1. cancels in-flight library queries;
  2. updates the cache optimistically, so the UI reacts instantly;
  3. rolls back to a snapshot if the request fails;
  4. calls `invalidateQueries(['user', uid, 'library'])` in `onSettled`.
- **Collections:** after creating, editing or deleting a collection, and after adding a title to it or removing one.
- **History:** after a details page is opened, after a single entry is removed, and after the history is cleared.
- **Profile:** after profile or settings changes.
- **Logout or user switch:** `removeQueries(['user'])` wipes all personal data from the cache, so the next user never sees it.
- **TMDB data:** read-only, so it only refreshes after its `staleTime` expires.

### Preventing stale responses from overwriting newer ones

- **Separate keys.** Every combination of filters has its own query key, so a late response for old filters is stored under its own key and never replaces the current result.
- **Cancellation.** The `AbortSignal` provided by TanStack Query is passed to `fetch`. When filters change or the user leaves the page, the outdated request is cancelled.
- **Debounced search.** A search request is sent only 450 ms after the user stops typing.
- **Safe optimistic updates.** Optimistic updates call `cancelQueries` first, so an in-flight refetch with old data cannot overwrite the change.
- **Smooth pagination.** `placeholderData: keepPreviousData` keeps the previous page on screen, dimmed, while the next one loads.

Every screen handles **loading** (skeletons and spinners), **error** (a message with a Retry button) and **empty** states (guidance on what to do next).

---

## Progressive Web App

The app is installable and works offline.

### Manifest and installation
- `public/manifest.json`: `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color`, plus icons at 192×192, 512×512 and a 512×512 maskable icon (`public/icons/`).
- The manifest is linked in `index.html` together with `theme-color` and `apple-touch-icon`. `start_url` and `scope` are relative (`./`), so the manifest works both on `localhost` and under `/<repo>/` on GitHub Pages.

### Service Worker (`src/sw.js`)
The Service Worker is written by hand. `vite-plugin-pwa` (in `injectManifest` mode) only injects the list of built files into `self.__WB_MANIFEST`.

| Event | What it does |
|---|---|
| `install` | Pre-caches the app shell: `index.html`, hashed JS/CSS bundles, icons, `manifest.json` and `offline.html` |
| `activate` | Deletes every `kadr-*` cache that does not belong to the current version, then calls `clients.claim()` |
| `message` | `SKIP_WAITING` activates a waiting worker. This is sent only when the user clicks **Update** |
| `fetch` | Routes each request to a caching strategy (see below) |

**Versioning.** The shell cache is named `kadr-shell-<hash>`, where the hash is computed from the build manifest, so every deploy creates a new cache. Runtime caches carry a format version (`kadr-api-v1`, `kadr-images-v1`, …).

**Updates.** `PwaUpdatePrompt` registers the worker through `virtual:pwa-register/react`. It checks for a new version hourly and whenever the tab becomes visible. When a new worker is waiting, the user sees *"A new version is available"* with an **Update** button. Clicking it sends `SKIP_WAITING`; the new worker activates, deletes the old caches and the page reloads. Users never have to clear browser storage by hand.

### Runtime caching

| Requests | Strategy | Cache | Limits |
|---|---|---|---|
| App shell (built JS/CSS/HTML, icons) | cache-first (pre-cached) | `kadr-shell-<hash>` | replaced on every deploy |
| TMDB posters and backdrops, local images | **cache-first** | `kadr-images-v1` | 150 entries, 30 days |
| Google Fonts files | **cache-first** | `kadr-fonts-v1` | 30 entries, 1 year |
| Google Fonts stylesheet | stale-while-revalidate | `kadr-fonts-v1` | same |
| TMDB API lists and details (`api.themoviedb.org/3/*`) | **network-first**, 6 s timeout, cache fallback on network error or 5xx | `kadr-api-v1` | 120 entries, 3 days |
| Page navigations | network-first; offline: app shell for visited pages, otherwise `offline.html` | `kadr-pages-v1` (visit markers only) | 80 entries, 30 days |

- **Offline flag.** A response served from the API cache gets the `X-Kadr-Cache: hit` and `X-Kadr-Cached-At` headers. `services/tmdb.js` turns them into a `cache` field on the data, and `CachedDataNotice` shows *"Showing saved data from …"* on the home, catalog and details pages. Cached data counts as stale immediately, so it is refetched as soon as the connection returns.
- **No private data in shared caches.** Only public TMDB endpoints, images and fonts are cached. The `api_key` is removed from cache keys. TMDB `authentication`/`account`/`session` endpoints are excluded. Firebase Auth (tokens) and Firestore (personal data) are never intercepted by the Service Worker. Firestore uses its default in-memory cache, so nothing personal is persisted.
- **No private data offline.** When the connection drops, the personal dashboard (`/profile/*`) shows *"Your diary is available only online"*, the library actions on details pages are hidden, and all personal queries (`['user', …]`) are reset in memory. They reload when the connection returns.
- **Failure handling.** Failed requests never crash the app. A network error becomes a readable message, and offline it shows the offline view with **Retry connection**.

### Offline page and connectivity indicator
- `/offline` is a dedicated route in the app. `public/offline.html` is a self-contained static page in the pre-cache. The Service Worker serves it when navigation fails and the page has never been visited. Both pages include a **Retry connection** button.
- The navbar shows an **Online / Offline** indicator, with a banner under it while offline. The status does not rely only on `navigator.onLine`. It is confirmed by a real `HEAD` request (`services/connection.js`) at startup, on the `online` event and whenever a request fails, and it is shared with TanStack Query's `onlineManager`.
- Visited pages and cached public data stay available offline. TanStack Query refetches stale data automatically once the connection returns.

### Mobile
The layout works from 320 px wide in both portrait and landscape: a burger menu, single-column forms and cards, and no horizontal scrolling. On touch screens, controls have targets of at least 44×44 px. Form fields use 16 px text so iOS does not zoom in.

### How to test
```bash
npm run build && npm run preview   # the Service Worker is disabled in npm run dev
```
DevTools → **Application**: *Manifest* (installability), *Service workers* (lifecycle, *Update on reload*), *Cache storage*. Use **Network → Offline** to simulate a lost connection. **Lighthouse** shows the PWA audit.

---

## Running locally

Requires Node.js 18+.

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

`.env.local` is listed in `.gitignore` and is never committed. `.env.example` documents every variable:

| Variable | Where to get it |
|---|---|
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | Firebase console → Project settings → General → Your apps → Web app (`firebaseConfig`) |
| `VITE_TMDB_API_KEY` | themoviedb.org → Settings → API (an API Key or an API Read Access Token both work) |
| `VITE_TMDB_LANGUAGE` | optional, defaults to `ru-RU` |

Restart `npm run dev` after editing `.env.local`, because Vite reads it only on startup. If the Firebase variables are missing, the app shows a setup screen instead of crashing.

### Firebase setup
1. Create a project in the [Firebase console](https://console.firebase.google.com).
2. **Authentication → Sign-in method:** enable **Email/Password** and **Google**.
3. **Firestore Database → Create database** in production mode. On the **Rules** tab, paste the contents of `firestore.rules` and publish them.
4. **Project settings → Your apps → Web (`</>`):** register an app and copy the `firebaseConfig` values into `.env.local`.
5. **Authentication → Settings → Authorized domains:** add `<user>.github.io` for the deployed site. `localhost` is already there.

---

## Deployment (GitHub Pages)

The site is built and published by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`.

1. **Settings → Pages → Build and deployment → Source:** select **GitHub Actions**.
2. **Settings → Secrets and variables → Actions:** add a repository secret for each variable: the six `VITE_FIREBASE_*` values and `VITE_TMDB_API_KEY`.
3. Push to `main`, or run the workflow manually from the **Actions** tab.

How it works:
- **Base path.** The workflow passes `BASE_PATH=/<repo>/`. Vite uses it as `base`, and React Router uses it as `basename`, so all links and assets respect the repository sub-path. If the repository is named `<user>.github.io`, set `BASE_PATH: /` in the workflow.
- **Direct links.** GitHub Pages cannot rewrite every path to `index.html`. Instead, the workflow copies `index.html` to `404.html`, so deep links such as `/<repo>/profile/stats` load the app correctly.
- **Public config.** The Firebase web config is public by design and ends up in the built JavaScript. Data is protected by the Firestore security rules and the authorized domains list, not by keeping the key secret.

---

Movie data is provided by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
