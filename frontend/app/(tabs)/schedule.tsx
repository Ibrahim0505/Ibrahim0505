import React, { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Basket, BellRinging, Clock } from "phosphor-react-native";

import { listLocations, type Location } from "@/src/api";
import { LocationCard } from "@/src/components/location-card";
import { formatKg } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";

export default function ScheduleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: locations = [], refetch, isFetching } = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const { ready, upcoming, totalKg } = useMemo(() => {
    const ready = locations.filter((l) => l.status === "ready");
    const upcoming = locations
      .filter((l) => l.status === "cooldown")
      .sort((a, b) => (a.next_harvest_at || "").localeCompare(b.next_harvest_at || ""));
    const totalKg = locations.reduce((s, l) => s + (l.total_harvest_kg || 0), 0);
    return { ready, upcoming, totalKg };
  }, [locations]);

  const go = (l: Location) => router.push(`/location/${l.id}`);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      testID="schedule-screen"
    >
      <Text style={styles.title}>Jadwal Panen</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <BellRinging size={22} weight="fill" color={colors.success} />
          <Text style={styles.summaryValue}>{ready.length}</Text>
          <Text style={styles.summaryLabel}>Siap Panen</Text>
        </View>
        <View style={styles.summaryCard}>
          <Clock size={22} weight="fill" color={colors.warning} />
          <Text style={styles.summaryValue}>{upcoming.length}</Text>
          <Text style={styles.summaryLabel}>Masa Tunggu</Text>
        </View>
        <View style={styles.summaryCard}>
          <Basket size={22} weight="fill" color={colors.brandPrimary} />
          <Text style={styles.summaryValue}>{formatKg(totalKg)}</Text>
          <Text style={styles.summaryLabel}>Total Panen</Text>
        </View>
      </View>

      <Text style={styles.section}>🟢 Siap dipanen ({ready.length})</Text>
      {ready.length === 0 ? (
        <Text style={styles.emptyLine}>Belum ada pohon yang siap panen.</Text>
      ) : (
        <View style={styles.group}>
          {ready.map((l) => (
            <LocationCard key={l.id} location={l} onPress={() => go(l)} />
          ))}
        </View>
      )}

      <Text style={styles.section}>🟠 Menunggu jadwal ({upcoming.length})</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.emptyLine}>Tidak ada jadwal mendatang.</Text>
      ) : (
        <View style={styles.group}>
          {upcoming.map((l) => (
            <LocationCard key={l.id} location={l} onPress={() => go(l)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800", marginBottom: 2 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { color: colors.onSurfaceSecondary, fontSize: 18, fontWeight: "800" },
  summaryLabel: { color: colors.muted, fontSize: 11, textAlign: "center" },
  section: { color: colors.onSurface, fontSize: 16, fontWeight: "700", marginTop: 6 },
  group: { gap: 12 },
  emptyLine: { color: colors.muted, fontSize: 14 },
}));
