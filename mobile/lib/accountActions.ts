import { Alert, Share, Platform } from "react-native";
import { api, setToken } from "./api";
import { ApiError } from "./api";

/**
 * Shared account-management flows used by both the client and contractor
 * profile screens. These wrap the same web API endpoints the website uses.
 */

/** Change password. The endpoint revokes all existing tokens and returns a
 * fresh one — we MUST persist it or the current mobile session (Bearer) dies. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data } = await api<{ success: boolean; token?: string }>(
    "/api/auth/change-password",
    { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }
  );
  if (data.token) await setToken(data.token);
}

/** Confirm + permanently delete the account, then run onDeleted (usually logout). */
export function confirmDeleteAccount(onDeleted: () => void) {
  Alert.alert(
    "Delete Account",
    "This permanently deletes your account and all associated data. This cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api("/api/auth/delete-account", { method: "DELETE" });
            onDeleted();
          } catch (e) {
            const msg =
              e instanceof ApiError
                ? e.message
                : "Something went wrong. Please try again.";
            Alert.alert("Couldn't delete account", msg);
          }
        },
      },
    ]
  );
}

/** Fetch the GDPR data export and hand it off — download on web, Share on native. */
export async function exportMyData(): Promise<void> {
  try {
    const { data } = await api<Record<string, unknown>>("/api/auth/data-export");
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === "web") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trovaar-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ title: "My Trovaar Data", message: json });
    }
  } catch (e) {
    const rateLimited = e instanceof ApiError && e.status === 429;
    Alert.alert(
      "Export unavailable",
      rateLimited
        ? "You can export your data once every 24 hours. Please try again later."
        : e instanceof ApiError
          ? e.message
          : "Something went wrong. Please try again."
    );
  }
}
