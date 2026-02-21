import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RizzResponse } from '../types/rizz';

const GUEST_RIZZ_HISTORY_KEY = 'guest_rizz_history_v1';
const GUEST_RIZZ_HISTORY_MAX = 60;
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function withinRetention(dateLike: string): boolean {
  const ts = new Date(dateLike).getTime();
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts <= RETENTION_MS;
}

function sortNewest(a: RizzResponse, b: RizzResponse): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function normalizeGuestRizzResponse(raw: any): RizzResponse {
  const now = new Date().toISOString();
  return {
    id: asString(raw?.id) || `guest-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    input_text: asString(raw?.input_text, ''),
    tone: asString(raw?.tone, 'chill'),
    category: asString(raw?.category, 'casual'),
    response_1: asString(raw?.response_1 || raw?.responses?.[0], ''),
    response_2: asString(raw?.response_2 || raw?.responses?.[1], ''),
    response_3: asString(raw?.response_3 || raw?.responses?.[2], ''),
    selected_idx: asNumber(raw?.selected_idx, 0),
    created_at: asString(raw?.created_at, now),
  };
}

export async function loadGuestRizzHistory(): Promise<RizzResponse[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_RIZZ_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed.map((item) => normalizeGuestRizzResponse(item));
    const retained = normalized.filter((item) => withinRetention(item.created_at)).sort(sortNewest);
    const trimmed = retained.slice(0, GUEST_RIZZ_HISTORY_MAX);

    if (trimmed.length !== normalized.length) {
      await AsyncStorage.setItem(GUEST_RIZZ_HISTORY_KEY, JSON.stringify(trimmed));
    }

    return trimmed;
  } catch {
    return [];
  }
}

export async function saveGuestRizzHistory(entry: RizzResponse): Promise<void> {
  const current = await loadGuestRizzHistory();
  const normalized = normalizeGuestRizzResponse(entry);
  const deduped = [normalized, ...current.filter((item) => item.id !== normalized.id)]
    .filter((item) => withinRetention(item.created_at))
    .sort(sortNewest)
    .slice(0, GUEST_RIZZ_HISTORY_MAX);
  await AsyncStorage.setItem(GUEST_RIZZ_HISTORY_KEY, JSON.stringify(deduped));
}

export async function saveGuestRizzHistories(entries: RizzResponse[]): Promise<void> {
  if (!Array.isArray(entries) || entries.length === 0) return;

  const normalized = entries
    .map((entry) => normalizeGuestRizzResponse(entry))
    .filter((entry) => withinRetention(entry.created_at))
    .sort(sortNewest);

  const seen = new Set<string>();
  const deduped: RizzResponse[] = [];
  for (const item of normalized) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
    if (deduped.length >= GUEST_RIZZ_HISTORY_MAX) break;
  }

  await AsyncStorage.setItem(GUEST_RIZZ_HISTORY_KEY, JSON.stringify(deduped));
}

export async function clearGuestRizzHistory(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_RIZZ_HISTORY_KEY);
}
