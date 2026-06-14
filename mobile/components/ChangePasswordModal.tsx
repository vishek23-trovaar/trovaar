import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { changePassword } from "../lib/accountActions";
import { colors } from "../lib/theme";

export default function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
    setSaving(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    setError("");
    if (!current || !next) {
      setError("Fill in both password fields.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      reset();
      onClose();
      setTimeout(
        () => Alert.alert("Password changed", "Your password has been updated."),
        150
      );
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Couldn't change password.");
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Change Password</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <Input
            label="Current password"
            secureTextEntry
            value={current}
            onChangeText={setCurrent}
            placeholder="Your current password"
            leftIcon="lock-closed-outline"
            autoCapitalize="none"
          />
          <Input
            label="New password"
            secureTextEntry
            value={next}
            onChangeText={setNext}
            placeholder="At least 8 characters"
            leftIcon="key-outline"
            autoCapitalize="none"
          />
          <Input
            label="Confirm new password"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter new password"
            leftIcon="key-outline"
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Update Password"
            onPress={submit}
            loading={saving}
            style={{ marginTop: 10 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#121316",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#23252a",
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f7f8f8",
    letterSpacing: -0.3,
  },
  error: {
    color: "#f87171",
    fontSize: 13,
  },
});
