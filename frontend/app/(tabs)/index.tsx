import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Crosshair, MapPin, Plus, Stack as StackIcon } from "phosphor-react-native";

import { KrotoMap, type KrotoMapHandle, type Region } from "@/src/components/kroto-map";
import { listLocations, type Location as Loc } from "@/src/api";
import { StatusBadge } from "@/src/components/status-badge";
import { harvestCountdown, formatCoord } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

const DEFAULT_REGION: Region = {
  latitude: -6.2088,
  longitude: 106.8456,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<KrotoMapHandle>(null);
  const sheetRef = useRef<BottomSheetModal>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");
  const [selected, setSelected] = useState<Loc | null>(null);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const { data: locations = [], refetch, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const goToCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      let granted = perm.granted;
      if (!granted && perm.canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.granted;
      }
      if (!granted) {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setRegion(next);
      mapRef.current?.animateToRegion(next);
    } catch {
      // keep current region
    } finally {
      setLocating(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!coords) goToCurrentLocation();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coords]),
  );

  const onMarkerPress = useCallback((loc: Loc) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelected(loc);
    sheetRef.current?.present();
  }, []);

  const openAdd = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const c = coords ?? { latitude: region.latitude, longitude: region.longitude };
    router.push(`/location/add?lat=${c.latitude}&lng=${c.longitude}`);
  }, [coords, region, router]);

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const snapPoints = useMemo(() => [280], []);

  const readyCount = locations.filter((l) => l.status === "ready").length;

  return (
    <View style={styles.container} testID="map-screen">
      <KrotoMap
        ref={mapRef}
        locations={locations}
        selectedId={selected?.id}
        mapType={mapType}
        initialRegion={region}
        showsUserLocation
        onMarkerPress={onMarkerPress}
        onMapPress={() => sheetRef.current?.dismiss()}
      />

      {/* Floating header */}
      <View style={[styles.header, { top: insets.top + 8, pointerEvents: "box-none" }]}>
        <View style={styles.headerCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <MapPin size={18} weight="fill" color={colors.onBrandPrimary} />
            </View>
            <View>
              <Text style={styles.brandTitle}>CARI KROTO</Text>
              <Text style={styles.brandSub}>
                {locations.length} lokasi · {readyCount} siap panen
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Map controls */}
      <View style={[styles.controls, { top: insets.top + 88 }]}>
        <Pressable
          style={styles.controlBtn}
          onPress={() => setMapType((t) => (t === "standard" ? "hybrid" : "standard"))}
          testID="toggle-maptype"
        >
          <StackIcon size={20} weight="bold" color={colors.onSurfaceSecondary} />
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={goToCurrentLocation} testID="recenter-btn">
          {locating ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : (
            <Crosshair size={20} weight="bold" color={colors.brandPrimary} />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={[styles.loadingOverlay, { pointerEvents: "none" }]}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : null}

      {/* FAB */}
      <Pressable style={[styles.fab, { bottom: bottomChrome + 16 }]} onPress={openAdd} testID="mark-location-fab">
        <Plus size={20} weight="bold" color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Tandai Lokasi</Text>
      </Pressable>

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: colors.surfaceSecondary }}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
      >
        <BottomSheetView style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {selected ? (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {selected.name}
                </Text>
                <StatusBadge status={selected.status} />
              </View>
              <Text style={styles.sheetCoord}>{formatCoord(selected.latitude, selected.longitude)}</Text>
              <View style={styles.sheetStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{harvestCountdown(selected.next_harvest_at)}</Text>
                  <Text style={styles.statLabel}>Jadwal panen</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{selected.visit_count}x</Text>
                  <Text style={styles.statLabel}>Kunjungan</Text>
                </View>
              </View>
              <Pressable
                style={styles.sheetBtn}
                onPress={() => {
                  sheetRef.current?.dismiss();
                  router.push(`/location/${selected.id}`);
                }}
                testID="sheet-detail-btn"
              >
                <Text style={styles.sheetBtnText}>Lihat Detail</Text>
              </Pressable>
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surfaceTertiary },
  header: { position: "absolute", left: 16, right: 16 },
  headerCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { color: colors.onSurfaceSecondary, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  brandSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  controls: { position: "absolute", right: 16, gap: 10 },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  fab: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
  sheet: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetTitle: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 20, fontWeight: "800" },
  sheetCoord: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  sheetStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.divider },
  statValue: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 12 },
  sheetBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  sheetBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
}));
