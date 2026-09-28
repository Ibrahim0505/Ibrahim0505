import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, Clock, X } from "phosphor-react-native";

import { createVisit, getLocation, listVisits, updateVisit } from "@/src/api";
import { PhotoManager } from "@/src/components/photo-manager";
import { useToast } from "@/src/components/toast";
import { scheduleHarvestReminder } from "@/src/notifications";
import { formatDate, formatDateTime } from "@/src/format";
import { makeStyles, useTheme } from "@/src/theme";

export default function LogHarvest() {
  const { id, visitId } = useLocalSearchParams<{ id: string; visitId?: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!visitId;

  const { data: visits = [] } = useQuery({
    queryKey: ["visits", id],
    queryFn: () => listVisits(id!),
    enabled: !!id && isEdit,
  });

  const [visitedAt, setVisitedAt] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [picker, setPicker] = useState<null | "date" | "time">(null);

  useEffect(() => {
    if (isEdit && visits.length) {
      const v = visits.find((x) => x.id === visitId);
      if (v) {
        setVisitedAt(new Date(v.visited_at));
        setAmount(v.amount_kg ? String(v.amount_kg) : "");
        setNotes(v.notes);
        setPhotos(v.photos);
      }
    }
  }, [isEdit, visits, visitId]);

  const parseAmount = () => {
    const n = parseFloat(amount.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        visited_at: visitedAt.toISOString(),
        amount_kg: parseAmount(),
        notes: notes.trim(),
        photos,
      };
      if (isEdit) return updateVisit(visitId!, payload);
      return createVisit(id!, payload);
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["visits", id] });
      qc.invalidateQueries({ queryKey: ["locations"] });
      const fresh = await getLocation(id!);
      qc.setQueryData(["location", id], fresh);
      scheduleHarvestReminder(fresh);
      toast(isEdit ? "Catatan diperbarui" : "Panen tercatat!", "success");
      router.back();
    },
    onError: (e: any) => toast(e?.message ?? "Gagal menyimpan", "error"),
  });

  const onPickerChange = (event: any, date?: Date) => {
    const current = picker;
    setPicker(null);
    if (event.type === "dismissed" || !date) return;
    if (current === "date") {
      const next = new Date(visitedAt);
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setVisitedAt(next);
    } else {
      const next = new Date(visitedAt);
      next.setHours(date.getHours(), date.getMinutes());
      setVisitedAt(next);
    }
  };

  return (
    <View style={styles.container} testID="log-harvest-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{isEdit ? "Edit Catatan" : "Catat Panen"}</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} testID="log-close">
          <X size={20} weight="bold" color={colors.onSurfaceSecondary} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={styles.content} bottomOffset={90}>
        <Text style={styles.label}>Waktu kunjungan</Text>
        {Platform.OS === "web" ? (
          <View style={styles.input}>
            <Text style={styles.dateText}>{formatDateTime(visitedAt.toISOString())}</Text>
          </View>
        ) : (
          <View style={styles.dateRow}>
            <Pressable style={styles.dateBtn} onPress={() => setPicker("date")} testID="pick-date">
              <CalendarBlank size={18} weight="bold" color={colors.brandPrimary} />
              <Text style={styles.dateText}>{formatDate(visitedAt.toISOString())}</Text>
            </Pressable>
            <Pressable style={styles.dateBtn} onPress={() => setPicker("time")} testID="pick-time">
              <Clock size={18} weight="bold" color={colors.brandPrimary} />
              <Text style={styles.dateText}>
                {visitedAt.getHours().toString().padStart(2, "0")}:
                {visitedAt.getMinutes().toString().padStart(2, "0")}
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>Hasil panen (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="Cth: 1.5"
          placeholderTextColor={colors.muted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          testID="input-amount"
        />

        <Text style={styles.label}>Catatan</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Kualitas kroto, kondisi sarang, dll"
          placeholderTextColor={colors.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          testID="input-visit-notes"
        />

        <Text style={styles.label}>Foto panen</Text>
        <PhotoManager photos={photos} onChange={setPhotos} />
      </KeyboardAwareScrollView>

      {picker ? (
        <DateTimePicker
          value={visitedAt}
          mode={picker}
          display="default"
          onChange={onPickerChange}
        />
      ) : null}

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={styles.saveBtn}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            testID="save-visit-btn"
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.saveText}>{isEdit ? "Simpan Perubahan" : "Simpan Panen"}</Text>
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
    justifyContent: "center",
  },
  textArea: { height: 90, textAlignVertical: "top" },
  dateRow: { flexDirection: "row", gap: 10 },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateText: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: { backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
}));
