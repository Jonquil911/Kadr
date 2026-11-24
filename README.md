# Kadr — a personal movie diary

A React app for keeping track of movies and TV shows: a TMDB catalog with filters and pagination, Firebase Authentication (email/password and Google), and a personal dashboard with a library, ratings, reviews, collections, statistics and viewing history.

**Live demo:** https://&lt;user&gt;.github.io/&lt;repo&gt;/

**Stack:** React 19 · Vite · React Router 7 · Redux Toolkit 2 + React Redux · Firebase Auth + Cloud Firestore · TMDB API · PWA (Service Worker, vite-plugin-pwa) · GitHub Pages

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
│   └── connection.js         # verified online/offline status
├── store/                    # Redux Toolkit
│   ├── index.js              # configureStore + reconnect / tab-focus listeners
│   ├── requestState.js       # shared entry shape, TTLs, condition, retries, pending/fulfilled/rejected helpers
│   ├── sessionActions.js     # cross-slice actions: clearUserData, invalidateUserData, revalidateAfterReconnect
│   └── slices/               # catalog, details, library, collections, history, profile
├── context/
│   ├── AuthContext.jsx       # AuthProvider + useAuth
│   └── ThemeContext.jsx
├── hooks/                    # useSelector/useDispatch wrappers: useMediaList, useMediaDetails, useLibrary, useCollections, …
├── utils/                    # pure helpers (formatting, validation, error messages, image URLs)
├── components/               # UI only
└── pages/                    # route pages and the dashboard
```

**Rules followed:**
- UI components never call `fetch`, Firestore or `localStorage`. They only use hooks. Hooks read the store with `useSelector` and start thunks with `useDispatch`; thunks call services.
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

## State management (Redux Toolkit)

All server data lives in a single Redux store (`src/store/index.js`, `configureStore` + `<Provider>` in `App.jsx`). What stays outside Redux, on purpose:
- **Authentication** stays in `AuthContext` (`onAuthStateChanged`, login/logout state). Slices only react to it: on logout or user switch `AuthContext` dispatches `clearUserData()`.
- **Temporary UI state** (open modals, form fields, whether a "Save" button is busy) stays local in components, via `useState` and the small `useAsyncAction` hook.
- **Filters, sorting and pagination** stay in the URL (`useCatalogFilters`), and the search box is debounced (450 ms). The filters object is part of the cache key.

### Slices

| Slice | Holds | Source |
|---|---|---|
| `catalog` | Catalog lists by filters, trending, curated home lists, genres. One entry per parameter set | TMDB |
| `details` | Title details, one entry per `mediaType:id` | TMDB |
| `library` | The user's library: status, rating, review, favorite | Firestore |
| `collections` | User collections | Firestore |
| `history` | Recently opened titles | Firestore |
| `profile` | Profile document: yearly goal, avatar color, bio | Firestore |

Every loadable resource is stored as an **entry** (`store/requestState.js`):

```js
{ data, status: 'idle' | 'loading' | 'succeeded' | 'failed', error, fetchedAt, requestId, invalidated }
```

Derived data (statistics, the watchlist, the "is this title in my library" index) is **never stored**. It is computed by selectors, so there is no duplicated state.

### Async thunks (`createAsyncThunk`)

| Thunk | Kind | What it does |
|---|---|---|
| `fetchCatalogList` | list | Catalog page by filters (`catalogSlice`) |
| `fetchTrendingList`, `fetchCollectionShelf`, `fetchGenreList` | list | Home shelves and the genre list |
| `fetchDetails` | details | Title page; also used to prefetch on card hover |
| `fetchLibrary`, `fetchCollections`, `fetchHistory`, `fetchUserProfile` | list | Personal data from Firestore |
| `saveLibraryEntry` | mutation | Create / update / delete a library entry (rating, status, review, favorite) — **optimistic** |
| `createCollectionThunk`, `updateCollectionThunk`, `deleteCollectionThunk`, `toggleCollectionItemThunk` | mutation | Collection CRUD (delete is optimistic) |
| `removeHistoryItem`, `clearHistoryThunk`, `trackView` | mutation | History |
| `updateProfileDoc` | mutation | Profile / preferences (optimistic for preferences) |

Each slice handles `pending`, `fulfilled` and `rejected` in `extraReducers`:
- **pending** → `status: 'loading'`, the request id is remembered;
- **fulfilled** → data saved with `fetchedAt`, but **only if the response belongs to the latest request** (otherwise ignored);
- **rejected** → `status: 'failed'` with a serializable error (`name`, `message`, `code`, `status`). A cancelled request (`meta.aborted`) is not treated as an error.

### Avoiding unnecessary requests

Every fetch thunk has a `condition` (`shouldFetch` in `requestState.js`). The thunk does not run at all when:
- the same request is already in progress (several components asking for the library at once send **one** request);
- the data is still fresh (TTL: catalog 5 min, details 30 min, genres 24 h, personal data 1 min);
- it is personal data and the app is offline.

`force: true` (the Retry button, refreshing after mutations) bypasses the TTL check. The `catalog` and `details` slices keep at most 80 / 60 entries and drop the oldest ones.

### Loading, errors, empty results, retries

- The hooks (`hooks/useStoreQuery.js`) turn an entry into `data`, `isPending`, `isFetching`, `isError`, `error`, `refetch` for the pages. Pages show skeletons/spinners, an error with a **Retry** button, or an empty state.
- Temporary failures are **retried automatically** up to twice (`withRetry`). 401, 403, 404, missing key/network and Firestore permission errors are not retried.
- While the next catalog page loads, the previous one stays on screen, dimmed.

### Stale requests

- **Separate entries per key.** A late response for old filters is stored under its own key and never replaces the current list.
- **Cancellation.** The thunk's `AbortSignal` is passed to `fetch`. When filters or the title change, the previous request is aborted (`promise.abort()` in `useCachedQuery`).
- **Latest request wins.** `fulfilled` is ignored if `meta.requestId` is not the entry's current `requestId`.
- **Mutations cancel reads.** The `pending` reducer of a mutation calls `cancelInFlight`, so a refetch that started before the mutation cannot overwrite the optimistic change.

### Refreshing data after mutations

- `saveLibraryEntry.pending` updates the list immediately and stores a snapshot. `rejected` restores the snapshot. In both cases the thunk then dispatches `fetchLibrary({ force: true })` to re-read the server state.
- Collection, history and profile mutations re-fetch their slice the same way.
- `trackView` only marks history as `invalidated`, so it is re-fetched the next time the History page is opened, without an extra request on every title view.
- Logout, user switch, account deletion and going offline dispatch `clearUserData()`, which resets every personal slice.

### Selectors

| Selector | Memoized | Used by |
|---|---|---|
| `selectLibraryItems`, `selectCollectionsList`, `selectHistoryItems` | no | base selectors, return a stable empty array |
| `selectCatalogEntry`, `selectDetailsEntry` | no | catalog and title pages |
| `selectLibraryIndex` | **`createSelector`** | Map `key → entry`; library badges on every card |
| `selectLibraryEntry` | uses the index | rating/status buttons on a title page |
| `selectWatchlist` | **`createSelector`** | "You wanted to watch" shelf on the home page |
| `selectLibraryStats` | **`createSelector`** | Stats page and profile overview; recomputed only when the library changes |

### Offline and PWA integration

The Service Worker (`src/sw.js`) is unchanged. TMDB thunks run offline as well: the Service Worker answers from its cache and marks the response (`X-Kadr-Cache`), and `services/tmdb.js` turns it into the `cache` flag shown as "Showing saved data". `store/index.js` subscribes to the verified connection status: when the connection returns it dispatches `revalidateAfterReconnect()`, which marks cached and failed entries as invalidated, so mounted screens re-fetch them. On returning to the tab, personal data older than one minute is invalidated (`invalidateUserData`).

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
- The navbar shows an **Online / Offline** indicator, with a banner under it while offline. The status does not rely only on `navigator.onLine`. It is confirmed by a real `HEAD` request (`services/connection.js`) at startup, on the `online` event and whenever a request fails, and the Redux store subscribes to it.
- Visited pages and cached public data stay available offline. When the connection returns, `revalidateAfterReconnect()` re-fetches cached and failed data automatically.

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
