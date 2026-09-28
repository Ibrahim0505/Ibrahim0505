import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { ThemeModeProvider } from "@/src/theme-mode";
import { ToastProvider } from "@/src/components/toast";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

function Navigator() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="location/add" options={{ presentation: "modal" }} />
        <Stack.Screen name="location/edit/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="log/[id]" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeModeProvider>
              <KeyboardProvider>
                <BottomSheetModalProvider>
                  <ToastProvider>
                    <Navigator />
                  </ToastProvider>
                </BottomSheetModalProvider>
              </KeyboardProvider>
            </ThemeModeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
