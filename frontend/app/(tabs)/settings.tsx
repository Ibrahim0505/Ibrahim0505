import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BellRinging, Check, Desktop, Moon, Sun, TreeEvergreen } from "phosphor-react-native";

import { useThemeMode, type ThemeMode } from "@/src/theme-mode";
import { ensureNotificationPermission } from "@/src/notifications";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

export default function SettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { mode, setMode } = useThemeMode();
  const toast = useToast();

  const modes: { key: ThemeMode; label: string; Icon: any }[] = [
    { key: "system", label: "Ikuti Sistem", Icon: Desktop },
    { key: "light", label: "Terang", Icon: Sun },
    { key: "dark", label: "Gelap", Icon: Moon },
  ];

  const testNotif = async () => {
    const granted = await ensureNotificationPermission();
    toast(
      granted ? "Notifikasi aktif! Kamu akan diingatkan saat waktunya panen." : "Izin notifikasi belum aktif.",
      granted ? "success" : "error",
    );
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      testID="settings-screen"
    >
      <Text style={styles.title}>Pengaturan</Text>

      <Text style={styles.section}>Tampilan</Text>
      <View style={styles.card}>
        {modes.map((m, i) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.row, i < modes.length - 1 && styles.rowBorder]}
              onPress={() => setMode(m.key)}
              testID={`theme-mode-${m.key}`}
            >
              <View style={styles.rowIcon}>
                <m.Icon size={20} weight="regular" color={colors.brandPrimary} />
              </View>
              <Text style={styles.rowLabel}>{m.label}</Text>
              {active ? <Check size={20} weight="bold" color={colors.brandPrimary} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>Notifikasi</Text>
      <Pressable style={styles.card} onPress={testNotif} testID="enable-notif-btn">
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <BellRinging size={20} weight="regular" color={colors.brandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Aktifkan pengingat panen</Text>
            <Text style={styles.rowSub}>Dapat notifikasi saat pohon siap dipanen</Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.section}>Tentang</Text>
      <View style={styles.aboutCard}>
        <View style={styles.aboutMark}>
          <TreeEvergreen size={28} weight="fill" color={colors.onBrandPrimary} />
        </View>
        <Text style={styles.aboutTitle}>CARI KROTO</Text>
        <Text style={styles.aboutText}>
          Petakan pohon kroto, catat riwayat panen, dan panen tiap hari dari database pohonmu sendiri.
        </Text>
        <Text style={styles.version}>Versi 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  title: { color: colors.onSurface, fontSize: 26, fontWeight: "800", marginBottom: 4 },
  section: { color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 10, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "600" },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  aboutCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  aboutMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutTitle: { color: colors.onSurfaceSecondary, fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  aboutText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  version: { color: colors.muted, fontSize: 12, marginTop: 4 },
}));
