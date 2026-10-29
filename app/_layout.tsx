import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '../src/presentation/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.cream },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="gameplay" />
        <Stack.Screen name="upgrades" />
        <Stack.Screen name="results" />
        <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  );
}
