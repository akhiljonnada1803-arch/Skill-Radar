import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigation() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!token && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)/roadmap');
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.canvas, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
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
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
