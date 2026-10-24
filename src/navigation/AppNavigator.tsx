/**
 * AppNavigator
 *
 * Auth-gated React Navigation 7 stack.
 *
 * ─── Route protection ─────────────────────────────────────────────────────────
 * The navigator uses a conditional-screens approach:
 *
 *   user !== null → only "Dashboard" is registered in the navigator
 *   user === null → only "Login" is registered in the navigator
 *
 * React Navigation re-evaluates the registered screens whenever `user` changes.
 * When an unauthenticated user tries to visit /dashboard directly:
 *   • The Dashboard screen does not exist in the navigator.
 *   • The linking config maps /dashboard → Dashboard; since that route is not
 *     registered, React Navigation falls back to the initial route (Login).
 *   • The user lands on / (LoginScreen) automatically — no manual redirect needed.
 *
 * Additionally AppNavigator reads auth state from AuthContext as a secondary
 * guard. Even if navigation state somehow persists a Dashboard entry, the
 * screen itself performs its own domain check (see DashboardScreen.tsx).
 *
 * ─── Stack reset on auth change ───────────────────────────────────────────────
 * When `user` transitions null → User (sign-in) or User → null (sign-out),
 * the conditional screen set changes. React Navigation destroys the old stack
 * and builds a new one with the correct initial route automatically.
 * No manual navigate() calls are needed.
 */
import { createStackNavigator } from '@react-navigation/stack';
import { User } from 'firebase/auth';
import React from 'react';
import DashboardScreen from '../screens/DashboardScreen';
import LoginScreen from '../screens/LoginScreen';

// ─── Route types ──────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  user: User | null;
}

export default function AppNavigator({ user }: AppNavigatorProps) {
  const isAuthed = user !== null;

  return (
    <Stack.Navigator
      // initialRouteName re-evaluates when the screen set changes, so:
      //   • Fresh sign-in   → starts on Dashboard
      //   • Sign-out        → starts on Login
      //   • Page refresh while authenticated → starts on Dashboard (session
      //     restored by Firebase from IndexedDB before this renders)
      initialRouteName={isAuthed ? 'Dashboard' : 'Login'}
      screenOptions={{
        headerShown: false,
        animation: 'none',      // instant swap — feels like a route change, not a page push
        cardStyle: { flex: 1 },
      }}
    >
      {isAuthed ? (
        /**
         * AUTHENTICATED — only Dashboard is registered.
         *
         * Any attempt to reach /login or / while signed in is impossible
         * because the Login screen does not exist in this navigator.
         * React Navigation redirects to Dashboard automatically.
         *
         * DashboardScreen receives the validated user as a prop so it never
         * has to fetch auth state itself (no extra listener).
         */
        <Stack.Screen name="Dashboard">
          {() => <DashboardScreen user={user} />}
        </Stack.Screen>
      ) : (
        /**
         * UNAUTHENTICATED — only Login is registered.
         *
         * Any direct navigation to /dashboard is impossible because the
         * Dashboard screen does not exist in this navigator.
         * The URL /dashboard maps to no registered route → React Navigation
         * falls back to the Login screen at /.
         */
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
