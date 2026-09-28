import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { ArrowsClockwise, MapPin, X } from "phosphor-react-native";

import { createLocation } from "@/src/api";
import { PhotoManager } from "@/src/components/photo-manager";
import { useToast } from "@/src/components/toast";
import { formatCoord } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";

const INTERVALS = [3, 7, 14, 21, 30];

export default function AddLocation() {
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [interval, setInterval] = useState(14);
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    params.lat && params.lng
      ? { latitude: parseFloat(params.lat), longitude: parseFloat(params.lng) }
      : null,
  );
  const [locating, setLocating] = useState(false);

  const refreshGps = async () => {
    setLocating(true);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      let granted = perm.granted;
      if (!granted && perm.canAskAgain) {
        granted = (await Location.requestForegroundPermissionsAsync()).granted;
      }
      if (!granted) {
        toast("Izin lokasi diperlukan untuk menandai pohon.", "error");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      toast("Gagal mendapatkan lokasi GPS.", "error");
    } finally {
      setLocating(false);
    }
  };

  const mutation = useMutation({
    mutationFn: () =>
      createLocation({
        name: name.trim(),
        notes: notes.trim(),
        latitude: coords!.latitude,
        longitude: coords!.longitude,
        harvest_interval_days: interval,
        photos,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast("Lokasi pohon tersimpan!", "success");
      router.back();
    },
    onError: (e: any) => toast(e?.message ?? "Gagal menyimpan", "error"),
  });

  const canSave = name.trim().length > 0 && !!coords && !mutation.isPending;

  const save = () => {
    if (!name.trim()) return toast("Isi nama pohon dulu.", "error");
    if (!coords) return toast("Ambil lokasi GPS dulu.", "error");
    mutation.mutate();
  };

  return (
    <View style={styles.container} testID="add-location-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Tandai Lokasi</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} testID="add-close">
          <X size={20} weight="bold" color={colors.onSurfaceSecondary} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={90}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gpsCard}>
          <View style={styles.gpsIcon}>
            <MapPin size={22} weight="fill" color={colors.onBrandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gpsLabel}>Titik GPS pohon</Text>
            <Text style={styles.gpsValue}>
              {coords ? formatCoord(coords.latitude, coords.longitude) : "Belum ada lokasi"}
            </Text>
          </View>
          <Pressable style={styles.gpsBtn} onPress={refreshGps} testID="refresh-gps">
            {locating ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <ArrowsClockwise size={18} weight="bold" color={colors.brandPrimary} />
            )}
          </Pressable>
        </View>

        <Text style={styles.label}>Nama pohon *</Text>
        <TextInput
          style={styles.input}
          placeholder="Cth: Pohon mangga belakang sawah"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          testID="input-name"
        />

        <Text style={styles.label}>Catatan</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Patokan lokasi, kondisi pohon, dll"
          placeholderTextColor={colors.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          testID="input-notes"
        />

        <Text style={styles.label}>Interval panen</Text>
        <View style={styles.intervalRow}>
          {INTERVALS.map((d) => {
            const active = interval === d;
            return (
              <Pressable
                key={d}
                style={[styles.intervalChip, active && styles.intervalChipActive]}
                onPress={() => setInterval(d)}
                testID={`interval-${d}`}
              >
                <Text style={[styles.intervalText, active && styles.intervalTextActive]}>{d} hari</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Foto pohon</Text>
        <PhotoManager photos={photos} onChange={setPhotos} />
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!canSave}
            testID="save-location-btn"
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.saveText}>Simpan Lokasi</Text>
            )}
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 8, paddingBottom: 24 },
  gpsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.brandTertiary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
  },
  gpsIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsLabel: { color: colors.onBrandTertiary, fontSize: 12, fontWeight: "600" },
  gpsValue: {
    color: colors.onBrandTertiary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  gpsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: colors.onSurface, fontSize: 14, fontWeight: "700", marginTop: 10, marginBottom: 2 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.onSurface,
    fontSize: 15,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  intervalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  intervalChip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intervalChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  intervalText: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "600" },
  intervalTextActive: { color: colors.onBrandPrimary },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: { backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
}));
