# HB+ Authentication

A cross-platform authentication app built with **Expo**, **React Native**, and **Firebase Authentication**. Supports Google Sign-In and Email/Password authentication with a strict domain restriction — only `@hbplus.fit` accounts are granted access.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 58 (React Native 0.88) |
| Language | TypeScript |
| Web rendering | React Native Web |
| Navigation | React Navigation 7 (Stack) |
| Authentication | Firebase Authentication v13 (modular SDK) |
| Auth providers | Google OAuth, Email/Password |
| Video background | expo-video |

---

## Project Structure

```
src/
├── components/          # Reusable UI (AuthCard, TextInputField, GoogleSignInButton, BackgroundVideo)
├── context/             # AuthContext — single shared Firebase auth state
├── hooks/               # useAuthState, useTokenRefresh
├── navigation/          # AppNavigator — auth-gated React Navigation stack
├── screens/             # LoginScreen, DashboardScreen
├── services/            # firebase.ts — Firebase app + Auth initialisation
└── utils/               # validateEmailDomain, authErrors
assets/                  # login_bg.mp4, icons, splash
```

---

## Setup

### Prerequisites

- Node.js 18+
- npm (comes with Node.js)

### Install

```bash
# Clone the repository
git clone <your-repo-url>
cd hbplus-auth

# Install dependencies
npm install
```

### Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Firebase project values (see [Firebase Configuration](#firebase-configuration) below).

### Run

```bash
# Web (primary target)
npx expo start --web

# Android
npx expo start --android

# iOS
npx expo start --ios
```

---

## Firebase Configuration

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use an existing one)
3. Add a **Web app** to the project

### 2. Enable authentication providers

In **Authentication → Sign-in method**, enable:

- **Email/Password**
- **Google**

### 3. Add authorised domains

In **Authentication → Settings → Authorized domains**, ensure the following are listed:

- `localhost` (for local development)
- Your production domain (when deploying)

### 4. Copy your credentials to `.env`

Get the values from **Project Settings → Your apps → Web app → SDK setup**:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=1:your-sender-id:web:your-app-id
```

> **Never commit `.env` to version control.** It is already excluded by `.gitignore`.

### 5. Firebase Auth initialisation

The app uses `initializeAuth` (not `getAuth`) with explicit settings in `src/services/firebase.ts`:

```ts
initializeAuth(app, {
  persistence: browserLocalPersistence,      // session survives page reload
  popupRedirectResolver: browserPopupRedirectResolver,
})
```

This is required for the Google redirect flow to work correctly — `getAuth()` alone does not guarantee session restoration after a redirect on all platforms.

---

## Authentication Flows

### Google Sign-In (Web)

The app uses `signInWithRedirect` instead of `signInWithPopup`. Expo's Metro dev server sends a `Cross-Origin-Opener-Policy: same-origin` header which severs the opener reference to any popup window, causing `signInWithPopup` to always throw `auth/popup-closed-by-user`.

**Flow:**
1. User clicks **Continue with Google**
2. `signInWithRedirect(auth, googleProvider)` navigates the tab to Google
3. Google authenticates the user and redirects back to `localhost:8081`
4. On the reloaded page, `getRedirectResult(auth)` retrieves the credential from session storage
5. `onAuthStateChanged` fires with the authenticated user
6. Domain validation runs — `@hbplus.fit` passes, all other domains are rejected

### Email/Password

- **Sign Up** — `createUserWithEmailAndPassword` + `updateProfile` to save display name
- **Sign In** — `signInWithEmailAndPassword`
- **Password Reset** — `sendPasswordResetEmail`

The email domain is validated **before** any Firebase call during sign-up and sign-in. Registration with a non-`@hbplus.fit` address is blocked client-side and never reaches Firebase.

---

## Domain Restriction

Only email addresses ending with `@hbplus.fit` (case-insensitive) are permitted.

The check is implemented in `src/utils/validateEmailDomain.ts`:

```ts
export function validateEmailDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return parts[1] === 'hbplus.fit';
}
```

**Where it is enforced:**

| Location | When |
|---|---|
| `LoginScreen` — email sign-in | Before calling Firebase |
| `LoginScreen` — email sign-up | Before calling Firebase |
| `LoginScreen` — password reset | Before calling Firebase |
| `useAuthState` — `onAuthStateChanged` | After every sign-in (including Google redirect) |
| `DashboardScreen` — mount guard | On dashboard load (defence-in-depth) |

For the Google flow, `useAuthState` handles rejection: if the email fails the domain check, `signOut(auth)` is called immediately and `domainBlocked` is set to `true`. The login screen displays:

> **Access restricted. Please login using your official @hbplus.fit email.**

---

## Protected Routes

Route protection uses React Navigation's **conditional screens** approach in `src/navigation/AppNavigator.tsx`:

- When `user !== null` — only the `Dashboard` screen is registered; navigating to `/` redirects to `/dashboard` automatically
- When `user === null` — only the `Login` screen is registered; navigating to `/dashboard` is impossible because the route does not exist

This means there is no separate redirect guard component — unregistered routes fall back to the initial route automatically.

---

## Token Security

- Firebase ID tokens are held only in Firebase SDK memory — never written to `AsyncStorage`, `localStorage`, or any log
- `browserLocalPersistence` (IndexedDB) stores only the refresh token, managed entirely by Firebase
- `useTokenRefresh` (in `src/hooks/useTokenRefresh.ts`) force-refreshes the ID token every **55 minutes** and when the app returns to the foreground, catching account revocations promptly
- `DashboardScreen` force-refreshes the token on mount as a secondary guard

---

## Testing

Start the web dev server:

```bash
npx expo start --web
```

Open `http://localhost:8081`.

### Authorized account (`@hbplus.fit`)

1. Click **Continue with Google** (or use Sign in with email)
2. Sign in with an `@hbplus.fit` Google account
3. The app navigates to the dashboard showing the user's name and email

### Unauthorized account (any other domain)

1. Click **Continue with Google**
2. Sign in with a `@gmail.com` or any other account
3. The app stays on the login screen and shows:
   > Access restricted. Please login using your official @hbplus.fit email.

### Email / Password

1. Switch to **Sign up** — create an account with an `@hbplus.fit` email and a password of 8+ characters
2. Switch to **Sign in** — sign in with the same credentials
3. Use **Forgot password?** to request a reset link (check your inbox)

### Logout

Click **Sign out** in the dashboard sidebar — the app returns to the login screen.

### Browser refresh while signed in

Refresh the page at `/dashboard` — the dark spinner appears briefly while Firebase restores the session from IndexedDB, then the dashboard reloads without prompting for sign-in again.

---

## Available Scripts

```bash
npx expo start --web      # start web dev server
npx expo start --android  # start on Android
npx expo start --ios      # start on iOS
npx tsc --noEmit          # TypeScript check
npx expo lint             # ESLint
```

---

## Security Notes

Client-side domain checks prevent UI access but are **not a security boundary** for Firebase resources. For production:

- Add Firebase Security Rules requiring `auth.token.email.matches(".*@hbplus\\.fit")` on all Firestore/Storage resources
- Verify the Firebase ID token server-side using the Admin SDK before processing any sensitive API request
- Keep the **Authorized Domains** list in Firebase Console minimal (production domain + `localhost` only)
- Rotate Firebase API keys if they are ever accidentally committed

---

## License

MIT
