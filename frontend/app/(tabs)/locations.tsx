import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, TreeEvergreen } from "phosphor-react-native";

import { listLocations, type Location } from "@/src/api";
import { LocationCard } from "@/src/components/location-card";
import { makeStyles, useTheme } from "@/src/theme";

type SortMode = "ready" | "recent" | "name";
const SORTS: { key: SortMode; label: string }[] = [
  { key: "ready", label: "Siap Panen" },
  { key: "recent", label: "Terbaru" },
  { key: "name", label: "Nama" },
];

export default function LocationsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("ready");

  const { data: locations = [], refetch, isFetching, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const filtered = useMemo(() => {
    let list = locations.filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()));
    list = [...list];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "recent")
      list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    else {
      // ready first, then soonest next harvest
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status === "ready" ? -1 : 1;
        return (a.next_harvest_at || "").localeCompare(b.next_harvest_at || "");
      });
    }
    return list;
  }, [locations, query, sort]);

  const renderItem = useCallback(
    ({ item }: { item: Location }) => (
      <LocationCard location={item} onPress={() => router.push(`/location/${item.id}`)} />
    ),
    [router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="locations-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Daftar Lokasi</Text>
        <View style={styles.searchBar}>
          <MagnifyingGlass size={18} weight="bold" color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama pohon..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            testID="search-input"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <Pressable
                key={s.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSort(s.key)}
                testID={`sort-chip-${s.key}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.brandPrimary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty} testID="locations-empty">
              <TreeEvergreen size={56} weight="duotone" color={colors.brandSecondary} />
              <Text style={styles.emptyTitle}>Belum ada pohon ditandai</Text>
              <Text style={styles.emptyText}>
                Buka tab Peta dan tekan "Tandai Lokasi" untuk menyimpan pohon kroto pertamamu.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 12, backgroundColor: colors.surface },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 15 },
  chipsScroll: { flexGrow: 0 },
  chipsRow: { gap: 8, paddingRight: 16 },
  chip: {
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandPrimary },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "700" },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
}));
