import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "phosphor-react-native";

import { getLocation, updateLocation } from "@/src/api";
import { useToast } from "@/src/components/toast";
import { scheduleHarvestReminder } from "@/src/notifications";
import { makeStyles, useTheme } from "@/src/theme";

const INTERVALS = [3, 7, 14, 21, 30];

export default function EditLocation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();

  const { data: location, isLoading } = useQuery({
    queryKey: ["location", id],
    queryFn: () => getLocation(id!),
    enabled: !!id,
  });

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [interval, setInterval] = useState(14);

  useEffect(() => {
    if (location) {
      setName(location.name);
      setNotes(location.notes);
      setInterval(location.harvest_interval_days);
    }
  }, [location]);

  const mutation = useMutation({
    mutationFn: () =>
      updateLocation(id!, { name: name.trim(), notes: notes.trim(), harvest_interval_days: interval }),
    onSuccess: async (updated) => {
      qc.invalidateQueries({ queryKey: ["location", id] });
      qc.invalidateQueries({ queryKey: ["locations"] });
      scheduleHarvestReminder(updated);
      toast("Perubahan tersimpan", "success");
      router.back();
    },
    onError: (e: any) => toast(e?.message ?? "Gagal menyimpan", "error"),
  });

  if (isLoading || !location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="edit-location-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Edit Lokasi</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} testID="edit-close">
          <X size={20} weight="bold" color={colors.onSurfaceSecondary} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.content} bottomOffset={90}>
        <Text style={styles.label}>Nama pohon *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.muted}
          testID="edit-input-name"
        />

        <Text style={styles.label}>Catatan</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholderTextColor={colors.muted}
          testID="edit-input-notes"
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
                testID={`edit-interval-${d}`}
              >
                <Text style={[styles.intervalText, active && styles.intervalTextActive]}>{d} hari</Text>
              </Pressable>
            );
          })}
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
            onPress={() => (name.trim() ? mutation.mutate() : toast("Nama tidak boleh kosong", "error"))}
            disabled={mutation.isPending}
            testID="save-edit-btn"
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.saveText}>Simpan Perubahan</Text>
            )}
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
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
