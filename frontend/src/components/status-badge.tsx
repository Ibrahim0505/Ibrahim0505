import React from "react";
import { Text, View } from "react-native";

import { makeStyles, useTheme } from "@/src/theme";
import type { HarvestStatus } from "@/src/api";

export function StatusBadge({ status, size = "md" }: { status: HarvestStatus; size?: "sm" | "md" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const ready = status === "ready";
  const bg = ready ? colors.success : colors.warning;
  const on = ready ? colors.onSuccess : colors.onWarning;
  return (
    <View
      style={[styles.badge, { backgroundColor: bg }, size === "sm" && styles.badgeSm]}
      testID={`status-badge-${status}`}
    >
      <View style={[styles.dot, { backgroundColor: on }]} />
      <Text style={[styles.text, { color: on }, size === "sm" && styles.textSm]}>
        {ready ? "Siap Panen" : "Masa Tunggu"}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "700" },
  textSm: { fontSize: 11 },
}));
