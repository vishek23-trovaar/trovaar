import { Platform } from "react-native";

// API URL configuration:
// - Production: https://trovaar.com (or override with EXPO_PUBLIC_API_URL)
// - Dev web: http://localhost:3001
// - Dev device: Set EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001 in mobile/.env
const getApiUrl = () => {
  // Allow env override for any environment
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  if (__DEV__) {
    return Platform.OS === "web" ? "http://localhost:3001" : "http://localhost:3001";
  }
  return "https://trovaar.com";
};

export const API_URL = getApiUrl();

const TOKEN_KEY = "auth_token";

// Web-safe token storage (SecureStore doesn't work on web)
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const SecureStore = await import("expo-secure-store");
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  const SecureStore = await import("expo-secure-store");
  await SecureStore.deleteItemAsync(key);
}

export async function getToken(): Promise<string | null> {
  return storageGet(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await storageSet(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await storageDelete(TOKEN_KEY);
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number }> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_URL}${path}`;
  console.log(`[API] ${options.method || "GET"} ${url}`);

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    console.error(`[API] Network error: ${msg}`);
    throw new ApiError(`Cannot reach server: ${msg}`, 0, null);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(`Server returned invalid response (${res.status})`, res.status, null);
  }

  console.log(`[API] ${res.status} ${path}`);
  if (!res.ok) {
    throw new ApiError((data as Record<string, string>).error || "Request failed", res.status, data);
  }
  return { data: data as T, status: res.status };
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}
