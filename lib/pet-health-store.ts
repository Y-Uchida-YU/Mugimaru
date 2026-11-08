import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Dog microchip and vaccine records.
 *
 * Stored only in the iOS Keychain (via expo-secure-store) on this device.
 * Nothing here is sent to Supabase or any other server.
 */

export type MicrochipRecord = {
  chipNumber: string;
  implantDate: string;
  implantClinic: string;
  registrationDate: string;
  memo: string;
  updatedAt: string;
};

export type VaccineKind = 'rabies' | 'combo' | 'other';

export type VaccineRecord = {
  id: string;
  kind: VaccineKind;
  name: string;
  date: string;
  nextDueDate: string;
  clinic: string;
  lotNumber: string;
  memo: string;
  updatedAt: string;
};

export type PetHealthData = {
  version: 1;
  microchip: MicrochipRecord | null;
  vaccines: VaccineRecord[];
};

export const EMPTY_PET_HEALTH: PetHealthData = { version: 1, microchip: null, vaccines: [] };

export const VACCINE_KIND_LABELS: Record<VaccineKind, string> = {
  rabies: '狂犬病',
  combo: '混合ワクチン',
  other: 'その他',
};

const KEYCHAIN_SERVICE = 'com.yutauchida.mugimaru.pet-health';
// The Keychain may reject large values, so the JSON is split into chunks.
const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 200;

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: KEYCHAIN_SERVICE,
  // Only readable while the device is unlocked, never synced to iCloud or restored to another device.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function baseKey(ownerId: string) {
  // SecureStore keys allow only alphanumerics, ".", "-" and "_".
  const safeOwner = ownerId.replace(/[^A-Za-z0-9._-]/g, '_') || 'default';
  return `petHealth.v1.${safeOwner}`;
}

export async function isPetHealthStorageAvailable() {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function loadPetHealth(ownerId: string): Promise<PetHealthData> {
  const key = baseKey(ownerId);
  const countRaw = await SecureStore.getItemAsync(`${key}.count`, STORE_OPTIONS);
  const count = Number(countRaw);
  if (!countRaw || !Number.isInteger(count) || count <= 0 || count > MAX_CHUNKS) {
    return EMPTY_PET_HEALTH;
  }

  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const part = await SecureStore.getItemAsync(`${key}.${index}`, STORE_OPTIONS);
    if (part == null) return EMPTY_PET_HEALTH;
    parts.push(part);
  }

  try {
    return normalizePetHealth(JSON.parse(parts.join('')));
  } catch {
    return EMPTY_PET_HEALTH;
  }
}

export async function savePetHealth(ownerId: string, data: PetHealthData) {
  const key = baseKey(ownerId);
  const json = JSON.stringify(data);
  const chunks: string[] = [];
  for (let offset = 0; offset < json.length; offset += CHUNK_SIZE) {
    chunks.push(json.slice(offset, offset + CHUNK_SIZE));
  }
  if (chunks.length > MAX_CHUNKS) {
    throw new Error('保存できるデータ量の上限を超えました。');
  }

  const previousCount = Number(await SecureStore.getItemAsync(`${key}.count`, STORE_OPTIONS)) || 0;
  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(`${key}.${index}`, chunks[index], STORE_OPTIONS);
  }
  await SecureStore.setItemAsync(`${key}.count`, String(chunks.length), STORE_OPTIONS);
  for (let index = chunks.length; index < previousCount; index += 1) {
    await SecureStore.deleteItemAsync(`${key}.${index}`, STORE_OPTIONS);
  }
}

export async function clearPetHealth(ownerId: string) {
  const key = baseKey(ownerId);
  const count = Number(await SecureStore.getItemAsync(`${key}.count`, STORE_OPTIONS)) || 0;
  await SecureStore.deleteItemAsync(`${key}.count`, STORE_OPTIONS);
  for (let index = 0; index < Math.min(count, MAX_CHUNKS); index += 1) {
    await SecureStore.deleteItemAsync(`${key}.${index}`, STORE_OPTIONS);
  }
}

function str(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizePetHealth(raw: unknown): PetHealthData {
  if (!raw || typeof raw !== 'object') return EMPTY_PET_HEALTH;
  const source = raw as Record<string, unknown>;

  const chip = source.microchip as Record<string, unknown> | null | undefined;
  const microchip: MicrochipRecord | null =
    chip && typeof chip === 'object' && str(chip.chipNumber)
      ? {
          chipNumber: str(chip.chipNumber),
          implantDate: str(chip.implantDate),
          implantClinic: str(chip.implantClinic),
          registrationDate: str(chip.registrationDate),
          memo: str(chip.memo),
          updatedAt: str(chip.updatedAt),
        }
      : null;

  const vaccines = Array.isArray(source.vaccines)
    ? source.vaccines
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !!str((item as Record<string, unknown>).id))
        .map((item) => {
          const kind = item.kind === 'rabies' || item.kind === 'combo' ? item.kind : 'other';
          return {
            id: str(item.id),
            kind,
            name: str(item.name),
            date: str(item.date),
            nextDueDate: str(item.nextDueDate),
            clinic: str(item.clinic),
            lotNumber: str(item.lotNumber),
            memo: str(item.memo),
            updatedAt: str(item.updatedAt),
          } satisfies VaccineRecord;
        })
    : [];

  return { version: 1, microchip, vaccines };
}

// ---- validation / date helpers ----

/** ISO 11784/11785 microchips used in Japan carry a 15-digit number. */
export function normalizeChipNumber(input: string) {
  return input.replace(/[^0-9]/g, '').slice(0, 15);
}

export function isValidChipNumber(value: string) {
  return /^\d{15}$/.test(value);
}

/** Formats free digits into YYYY-MM-DD while typing. */
export function formatDateInput(input: string) {
  const digits = input.replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function isValidDateOrEmpty(value: string) {
  return value === '' || parseDate(value) !== null;
}

export function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addOneYear(value: string) {
  const date = parseDate(value);
  if (!date) return '';
  const next = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
  return toDateString(next);
}

export function formatDisplayDate(value: string) {
  const date = parseDate(value);
  if (!date) return '未設定';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export type DueStatus = 'none' | 'ok' | 'soon' | 'overdue';

export function getDueStatus(nextDueDate: string, today = new Date()): { status: DueStatus; days: number } {
  const due = parseDate(nextDueDate);
  if (!due) return { status: 'none', days: 0 };
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((due.getTime() - start.getTime()) / 86_400_000);
  if (days < 0) return { status: 'overdue', days };
  if (days <= 30) return { status: 'soon', days };
  return { status: 'ok', days };
}

export function createVaccineId() {
  return `vac_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Latest record per vaccine kind+name, used for the "next due" summary. */
export function latestVaccinesByType(vaccines: VaccineRecord[]) {
  const map = new Map<string, VaccineRecord>();
  for (const record of vaccines) {
    const key = `${record.kind}:${record.kind === 'rabies' ? '' : record.name.trim()}`;
    const current = map.get(key);
    if (!current || record.date > current.date) map.set(key, record);
  }
  return [...map.values()].sort((a, b) => (a.nextDueDate || '9999').localeCompare(b.nextDueDate || '9999'));
}

export function sortVaccinesByDateDesc(vaccines: VaccineRecord[]) {
  return [...vaccines].sort((a, b) => b.date.localeCompare(a.date));
}
