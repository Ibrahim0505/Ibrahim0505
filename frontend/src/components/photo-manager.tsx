import React, { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, Plus, X } from "phosphor-react-native";

import { makeStyles, useTheme } from "@/src/theme";
import { fileUrl, uploadPhoto } from "@/src/api";
import { useToast } from "@/src/components/toast";

type Props = {
  photos: string[];
  onChange: (photos: string[]) => void;
  editable?: boolean;
};

export function PhotoManager({ photos, onChange, editable = true }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleAsset = async (uri: string) => {
    setBusy(true);
    try {
      const path = await uploadPhoto(uri);
      onChange([...photos, path]);
      toast("Foto tersimpan", "success");
    } catch (e: any) {
      toast(e?.message ?? "Gagal mengunggah foto", "error");
    } finally {
      setBusy(false);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.getCameraPermissionsAsync();
    let granted = perm.granted;
    if (!granted && perm.canAskAgain) {
      const req = await ImagePicker.requestCameraPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) {
      toast("Izin kamera diperlukan. Buka Pengaturan untuk mengaktifkan.", "error");
      Linking.openSettings();
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) await handleAsset(res.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let granted = perm.granted;
    if (!granted && perm.canAskAgain) {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) {
      toast("Izin galeri diperlukan. Buka Pengaturan untuk mengaktifkan.", "error");
      Linking.openSettings();
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) await handleAsset(res.assets[0].uri);
  };

  const removeAt = (path: string) => onChange(photos.filter((p) => p !== path));

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((path) => (
          <View key={path} style={styles.thumbWrap} testID={`photo-thumb-${path}`}>
            <Image source={{ uri: fileUrl(path) }} style={styles.thumb} contentFit="cover" transition={150} />
            {editable ? (
              <Pressable style={styles.removeBtn} onPress={() => removeAt(path)} testID={`photo-remove-${path}`}>
                <X size={13} weight="bold" color={colors.onError} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {editable ? (
          <>
            <Pressable style={styles.addBtn} onPress={pickFromCamera} disabled={busy} testID="photo-camera-btn">
              {busy ? (
                <ActivityIndicator color={colors.brandPrimary} />
              ) : (
                <>
                  <Camera size={22} weight="regular" color={colors.brandPrimary} />
                  <Text style={styles.addText}>Kamera</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.addBtn} onPress={pickFromGallery} disabled={busy} testID="photo-gallery-btn">
              <ImageIcon size={22} weight="regular" color={colors.brandPrimary} />
              <Text style={styles.addText}>Galeri</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
      {editable && photos.length === 0 && !busy ? (
        <View style={styles.emptyHint}>
          <Plus size={14} color={colors.muted} />
          <Text style={styles.emptyText}>Tambahkan foto pohon</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 8 },
  row: { gap: 10, paddingVertical: 4, alignItems: "center" },
  thumbWrap: { position: "relative" },
  thumb: { width: 92, height: 92, borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surfaceSecondary,
  },
  addBtn: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "600" },
  emptyHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  emptyText: { color: colors.muted, fontSize: 12 },
}));
