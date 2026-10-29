import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthContext';
import { Colors } from '../src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor={Colors.canvas} />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: Colors.canvas,
              },
              headerTitleStyle: {
                fontFamily: 'serif',
                fontWeight: '700',
                color: Colors.ink,
                fontSize: 18,
              },
              headerTintColor: Colors.ink,
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth/login"
              options={{
                headerShown: false,
                title: 'Operative Login',
              }}
            />
            <Stack.Screen
              name="auth/register"
              options={{
                headerShown: false,
                title: 'Register Dossier',
              }}
            />
            <Stack.Screen
              name="domain-select"
              options={{
                headerShown: false,
                title: 'Select Discipline',
              }}
            />
            <Stack.Screen
              name="suggestions"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="skill/[id]"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="discovery/[id]"
              options={{
                title: 'SPECIMEN ARCHIVE',
                headerBackTitle: 'Back',
                headerStyle: {
                  backgroundColor: Colors.canvas,
                },
                headerTitleStyle: {
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  color: Colors.ink,
                  fontSize: 14,
                },
                headerTintColor: Colors.ink,
              }}
            />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
