import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { CaretRight, MapPin } from "phosphor-react-native";

import { makeStyles, useTheme } from "@/src/theme";
import { fileUrl, type Location } from "@/src/api";
import { StatusBadge } from "@/src/components/status-badge";
import { fromNow, harvestCountdown } from "@/src/format";

export function LocationCard({ location, onPress }: { location: Location; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const thumb = location.photos[0];
  const initials = location.name.trim().slice(0, 2).toUpperCase() || "??";

  return (
    <Pressable style={styles.card} onPress={onPress} testID={`location-card-${location.id}`}>
      {thumb ? (
        <Image source={{ uri: fileUrl(thumb) }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {location.name}
        </Text>
        <View style={styles.metaRow}>
          <MapPin size={13} weight="fill" color={colors.muted} />
          <Text style={styles.meta} numberOfLines={1}>
            {location.last_visit_at ? `Dikunjungi ${fromNow(location.last_visit_at)}` : "Belum dikunjungi"}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge status={location.status} size="sm" />
          <Text style={styles.countdown}>{harvestCountdown(location.next_harvest_at)}</Text>
        </View>
      </View>
      <CaretRight size={18} weight="bold" color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 60, height: 60, borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  thumbFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTertiary },
  initials: { color: colors.onBrandTertiary, fontSize: 18, fontWeight: "800" },
  body: { flex: 1, gap: 5 },
  name: { color: colors.onSurfaceSecondary, fontSize: 16, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { flex: 1, color: colors.muted, fontSize: 13 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  countdown: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600" },
}));
