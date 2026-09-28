import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { makeStyles, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onCancel} testID="confirm-cancel">
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: destructive ? colors.error : colors.brandPrimary }]}
              onPress={onConfirm}
              testID="confirm-ok"
            >
              <Text style={[styles.confirmText, { color: destructive ? colors.onError : colors.onBrandPrimary }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    padding: 22,
    gap: 8,
  },
  title: { color: colors.onSurfaceSecondary, fontSize: 18, fontWeight: "800" },
  message: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  cancelBtn: { backgroundColor: colors.surfaceTertiary },
  cancelText: { color: colors.onSurfaceTertiary, fontSize: 15, fontWeight: "700" },
  confirmText: { fontSize: 15, fontWeight: "700" },
}));
