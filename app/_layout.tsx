import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { CourseProvider, useCourse } from "@/lib/CourseContext";
import { router, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/lib/useTheme";

SplashScreen.preventAutoHideAsync();

function NavigationController({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { course, isLoading: courseLoading } = useCourse();
  const segments = useSegments();
  const { colors } = useTheme();

  useEffect(() => {
    if (authLoading || courseLoading) return;

    const inAuth = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      if (!inAuth) {
        router.replace("/auth");
      }
    } else if (!course) {
      if (!inOnboarding) {
        router.replace("/onboarding");
      }
    } else {
      if (inAuth || inOnboarding) {
        router.replace("/(tabs)");
      }
    }
  }, [user, course, authLoading, courseLoading, segments]);

  if (authLoading || courseLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="year/[id]" />
      <Stack.Screen name="module/[yearId]/[moduleId]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AuthProvider>
              <CourseProvider>
                <NavigationController>
                  <RootLayoutNav />
                </NavigationController>
              </CourseProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
