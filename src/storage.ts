import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Settings } from './nextdns';

// endsAt === null means a "permanent" block. A permanent block can request an
// unlock; unlockAt is then the time (72h later) when it finally lifts.
export type Block = { id: string; target: string; endsAt: number | null; unlockAt?: number | null };

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export const save = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

export const KEYS = { blocks: 'blocks', settings: 'settings' };
export type { Settings };
