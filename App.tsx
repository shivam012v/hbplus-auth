/**
 * App.tsx — root entry point and auth router
 *
 * Wraps the entire tree in <AuthProvider> so auth state is initialised exactly
 * once. All screens consume it via useAuth() rather than calling useAuthState()
 * directly, which means there is only ever one onAuthStateChanged listener and
 * one getRedirectResult call active at a time.
 *
 * ─── URL routing ──────────────────────────────────────────────────────────────
 *   /            → Login screen  (always accessible when not signed in)
 *   /dashboard   → Dashboard screen (only when signed in as @hbplus.fit)
 *
 * ─── Auth states ──────────────────────────────────────────────────────────────
 *   loading === true          → dark splash spinner while session resolves
 *   loading === false, user   → navigate to Dashboard
 *   loading === false, !user  → navigate to Login
 */
import 'react-native-gesture-handler';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator, { type RootStackParamList } from './src/navigation/AppNavigator';

// ─── URL / deep-link config ───────────────────────────────────────────────────
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      Login:     '',
      Dashboard: 'dashboard',
    },
  },
};

// ─── Inner root (must be inside AuthProvider) ─────────────────────────────────
function AppRoot() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <AppNavigator user={user} />
    </NavigationContainer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#07071A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
