import React, { forwardRef, useImperativeHandle } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MapPin, MapTrifold } from "phosphor-react-native";

import { makeStyles, useTheme } from "@/src/theme";
import type { Location } from "@/src/api";

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type KrotoMapHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
};

type Props = {
  locations: Location[];
  selectedId?: string | null;
  mapType?: "standard" | "hybrid";
  initialRegion?: Region;
  showsUserLocation?: boolean;
  onMarkerPress?: (loc: Location) => void;
  onMapPress?: () => void;
};

// Web preview cannot render react-native-maps. Show a legible placeholder that
// still lists the marked locations so the rest of the app is testable.
export const KrotoMap = forwardRef<KrotoMapHandle, Props>(function KrotoMap(
  { locations, selectedId, onMarkerPress },
  ref,
) {
  const styles = useStyles();
  const { colors } = useTheme();
  useImperativeHandle(ref, () => ({ animateToRegion: () => {} }));

  return (
    <View style={styles.container} testID="kroto-map">
      <View style={styles.hint}>
        <MapTrifold size={40} weight="duotone" color={colors.brandSecondary} />
        <Text style={styles.hintTitle}>Peta interaktif</Text>
        <Text style={styles.hintText}>
          Peta GPS aktif di aplikasi Expo Go / perangkat. Berikut lokasi yang sudah ditandai:
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {locations.map((loc) => {
          const ready = loc.status === "ready";
          const color = ready ? colors.success : colors.warning;
          return (
            <Pressable
              key={loc.id}
              style={[styles.row, selectedId === loc.id && styles.rowSelected]}
              onPress={() => onMarkerPress?.(loc)}
              testID={`web-map-marker-${loc.id}`}
            >
              <View style={[styles.dot, { backgroundColor: color }]}>
                <MapPin size={16} weight="fill" color={ready ? colors.onSuccess : colors.onWarning} />
              </View>
              <Text style={styles.rowText} numberOfLines={1}>
                {loc.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surfaceTertiary },
  hint: { alignItems: "center", paddingTop: 120, paddingHorizontal: 32, gap: 8 },
  hintTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  hintText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: { borderColor: colors.brandPrimary, borderWidth: 2 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "600" },
}));
