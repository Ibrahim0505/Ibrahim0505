import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, WarningCircle, Info } from "phosphor-react-native";

import { makeStyles, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastItem = { message: string; type: ToastType };

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      setToast({ message, type });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        setToast(null),
      );
    }, 2600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, anim]);

  const iconColor =
    toast?.type === "success" ? colors.success : toast?.type === "error" ? colors.error : colors.info;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              top: insets.top + 8,
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
              ],
            },
          ]}
        >
          <Pressable style={styles.toast} onPress={() => setToast(null)} testID="toast">
            <View style={[styles.iconDot, { backgroundColor: iconColor }]}>
              {toast.type === "success" ? (
                <CheckCircle size={16} weight="fill" color={colors.onSuccess} />
              ) : toast.type === "error" ? (
                <WarningCircle size={16} weight="fill" color={colors.onError} />
              ) : (
                <Info size={16} weight="fill" color={colors.onInfo} />
              )}
            </View>
            <Text style={styles.text} numberOfLines={3}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceInverse,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    maxWidth: 460,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flexShrink: 1,
    color: colors.onSurfaceInverse,
    fontSize: 14,
    fontWeight: "500",
  },
}));
