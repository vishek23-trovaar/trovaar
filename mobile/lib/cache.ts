/**
 * Tiny stale-while-revalidate cache backed by AsyncStorage.
 *
 * Usage:
 *   const cached = await cacheRead<Job[]>("client-jobs");
 *   if (cached) setJobs(cached);         // instant paint
 *   const fresh = await api(...);
 *   setJobs(fresh);
 *   await cacheWrite("client-jobs", fresh);
 *
 * Intentionally small: no TTL enforcement, no background worker. The caller
 * is always responsible for revalidating — this just makes the first paint
 * feel instant on a warm app.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "trovaar-cache:";

interface Envelope<T> {
  v: 1;
  ts: number;
  data: T;
}

export async function cacheRead<T>(
  key: string,
  maxAgeMs = 24 * 60 * 60 * 1000
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (env.v !== 1) return null;
    if (Date.now() - env.ts > maxAgeMs) return null;
    return env.data;
  } catch {
    return null;
  }
}

export async function cacheWrite<T>(key: string, data: T): Promise<void> {
  try {
    const env: Envelope<T> = { v: 1, ts: Date.now(), data };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    // swallow — cache failures should never crash the app
  }
}

export async function cacheClear(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // swallow
  }
}
