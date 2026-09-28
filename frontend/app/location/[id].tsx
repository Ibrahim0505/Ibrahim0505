import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Basket,
  CaretLeft,
  Clock,
  MapPin,
  NotePencil,
  PencilSimple,
  Plus,
  Trash,
} from "phosphor-react-native";

import {
  deleteLocation,
  deleteVisit,
  fileUrl,
  getLocation,
  listVisits,
  updateLocation,
  type Visit,
} from "@/src/api";
import { StatusBadge } from "@/src/components/status-badge";
import { PhotoManager } from "@/src/components/photo-manager";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import { useToast } from "@/src/components/toast";
import { formatCoord, formatDateTime, formatKg, harvestCountdown } from "@/src/format";
import { cancelHarvestReminder, scheduleHarvestReminder } from "@/src/notifications";
import { makeStyles, useTheme } from "@/src/theme";

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1614022837699-f8a036d6bd58?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function LocationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteVisitId, setDeleteVisitId] = useState<string | null>(null);

  const { data: location, isLoading } = useQuery({
    queryKey: ["location", id],
    queryFn: () => getLocation(id!),
    enabled: !!id,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["visits", id],
    queryFn: () => listVisits(id!),
    enabled: !!id,
  });

  const photoMutation = useMutation({
    mutationFn: (photos: string[]) => updateLocation(id!, { photos }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["location", id] });
      qc.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const deleteLocMutation = useMutation({
    mutationFn: () => deleteLocation(id!),
    onSuccess: async () => {
      await cancelHarvestReminder(id!);
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast("Lokasi dihapus", "success");
      router.back();
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: (visitId: string) => deleteVisit(visitId),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["visits", id] });
      qc.invalidateQueries({ queryKey: ["locations"] });
      const fresh = await getLocation(id!);
      qc.setQueryData(["location", id], fresh);
      scheduleHarvestReminder(fresh);
      toast("Riwayat dihapus", "success");
    },
  });

  if (isLoading || !location) {
    return (
      <View style={styles.loading} testID="detail-loading">
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  const hero = location.photos[0] ? fileUrl(location.photos[0]) : FALLBACK_HERO;

  return (
    <View style={styles.container} testID="detail-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: hero }} style={styles.heroImg} contentFit="cover" transition={200} />
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(18,20,18,0.85)"]}
            style={styles.scrim}
          />
          <View style={[styles.heroTop, { top: insets.top + 8 }]}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()} testID="detail-back">
              <CaretLeft size={20} weight="bold" color="#FFFFFF" />
            </Pressable>
            <View style={styles.heroActions}>
              <Pressable
                style={styles.circleBtn}
                onPress={() => router.push(`/location/edit/${id}`)}
                testID="detail-edit"
              >
                <PencilSimple size={18} weight="bold" color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.circleBtn} onPress={() => setConfirmDelete(true)} testID="detail-delete">
                <Trash size={18} weight="bold" color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroText}>
            <StatusBadge status={location.status} />
            <Text style={styles.heroTitle}>{location.name}</Text>
            <View style={styles.heroCoordRow}>
              <MapPin size={14} weight="fill" color="#FFFFFF" />
              <Text style={styles.heroCoord}>{formatCoord(location.latitude, location.longitude)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Clock size={20} weight="fill" color={colors.warning} />
              <Text style={styles.statValue}>{harvestCountdown(location.next_harvest_at)}</Text>
              <Text style={styles.statLabel}>Jadwal panen</Text>
            </View>
            <View style={styles.statCard}>
              <Basket size={20} weight="fill" color={colors.brandPrimary} />
              <Text style={styles.statValue}>{formatKg(location.total_harvest_kg)}</Text>
              <Text style={styles.statLabel}>Total panen</Text>
            </View>
            <View style={styles.statCard}>
              <NotePencil size={20} weight="fill" color={colors.info} />
              <Text style={styles.statValue}>{location.visit_count}x</Text>
              <Text style={styles.statLabel}>Kunjungan</Text>
            </View>
          </View>

          {location.notes ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Catatan</Text>
              <Text style={styles.notes}>{location.notes}</Text>
            </View>
          ) : null}

          {/* Photos */}
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Foto Pohon</Text>
            <PhotoManager
              photos={location.photos}
              onChange={(photos) => photoMutation.mutate(photos)}
            />
          </View>

          {/* Visit history */}
          <View style={styles.block}>
            <View style={styles.historyHeader}>
              <Text style={styles.blockTitle}>Riwayat Kunjungan</Text>
              <Text style={styles.historyCount}>{visits.length} catatan</Text>
            </View>
            {visits.length === 0 ? (
              <Text style={styles.emptyHistory}>Belum ada catatan panen. Tekan "Catat Panen" di bawah.</Text>
            ) : (
              <View style={styles.timeline}>
                {visits.map((v) => (
                  <VisitRow
                    key={v.id}
                    visit={v}
                    onEdit={() => router.push(`/log/${id}?visitId=${v.id}`)}
                    onDelete={() => setDeleteVisitId(v.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.cta} onPress={() => router.push(`/log/${id}`)} testID="record-harvest-btn">
          <Plus size={20} weight="bold" color={colors.onBrandPrimary} />
          <Text style={styles.ctaText}>Catat Panen</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Hapus lokasi ini?"
        message="Semua riwayat kunjungan juga akan dihapus."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          deleteLocMutation.mutate();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        visible={!!deleteVisitId}
        title="Hapus catatan ini?"
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (deleteVisitId) deleteVisitMutation.mutate(deleteVisitId);
          setDeleteVisitId(null);
        }}
        onCancel={() => setDeleteVisitId(null)}
      />
    </View>
  );
}

function VisitRow({
  visit,
  onEdit,
  onDelete,
}: {
  visit: Visit;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.visitRow} testID={`visit-row-${visit.id}`}>
      <View style={styles.visitDot} />
      <View style={styles.visitBody}>
        <View style={styles.visitTop}>
          <Text style={styles.visitDate}>{formatDateTime(visit.visited_at)}</Text>
          <Text style={styles.visitKg}>{formatKg(visit.amount_kg)}</Text>
        </View>
        {visit.notes ? <Text style={styles.visitNotes}>{visit.notes}</Text> : null}
        {visit.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visitPhotos}>
            {visit.photos.map((p) => (
              <Image key={p} source={{ uri: fileUrl(p) }} style={styles.visitPhoto} contentFit="cover" />
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.visitActions}>
          <Pressable style={styles.visitAction} onPress={onEdit} testID={`visit-edit-${visit.id}`}>
            <PencilSimple size={14} weight="bold" color={colors.info} />
            <Text style={styles.visitActionText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.visitAction} onPress={onDelete} testID={`visit-delete-${visit.id}`}>
            <Trash size={14} weight="bold" color={colors.error} />
            <Text style={[styles.visitActionText, { color: colors.error }]}>Hapus</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  hero: { height: 300, backgroundColor: colors.surfaceTertiary, justifyContent: "flex-end" },
  heroImg: { ...StyleSheetAbsolute() },
  scrim: { ...StyleSheetAbsolute() },
  heroTop: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroActions: { flexDirection: "row", gap: 10 },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { padding: 20, gap: 8 },
  heroTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  heroCoordRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroCoord: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  },
  content: { padding: 16, gap: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "800", textAlign: "center" },
  statLabel: { color: colors.muted, fontSize: 11, textAlign: "center" },
  block: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockTitle: { color: colors.onSurfaceSecondary, fontSize: 16, fontWeight: "700" },
  notes: { color: colors.onSurfaceTertiary, fontSize: 14, lineHeight: 21 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyCount: { color: colors.muted, fontSize: 13 },
  emptyHistory: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  timeline: { gap: 14 },
  visitRow: { flexDirection: "row", gap: 12 },
  visitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brandPrimary,
    marginTop: 5,
  },
  visitBody: {
    flex: 1,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 12,
  },
  visitTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  visitDate: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "700" },
  visitKg: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
  visitNotes: { color: colors.onSurfaceTertiary, fontSize: 13, lineHeight: 19 },
  visitPhotos: { gap: 8, paddingVertical: 2 },
  visitPhoto: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surfaceTertiary },
  visitActions: { flexDirection: "row", gap: 18, marginTop: 2 },
  visitAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  visitActionText: { color: colors.info, fontSize: 13, fontWeight: "600" },
  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brandPrimary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };
}
