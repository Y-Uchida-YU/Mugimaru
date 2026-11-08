import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import {
  clearPetHealth,
  EMPTY_PET_HEALTH,
  isPetHealthStorageAvailable,
  loadPetHealth,
  savePetHealth,
  type PetHealthData,
} from '@/lib/pet-health-store';

type Status = 'loading' | 'ready' | 'unavailable' | 'error';

/** Loads the signed-in user's pet health data from the Keychain each time the screen gains focus. */
export function usePetHealth() {
  const { profile } = useAuth();
  const ownerId = profile?.externalId ?? '';
  const [data, setData] = useState<PetHealthData>(EMPTY_PET_HEALTH);
  const [status, setStatus] = useState<Status>('loading');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        if (!ownerId) return;
        if (!(await isPetHealthStorageAvailable())) {
          if (active) setStatus('unavailable');
          return;
        }
        try {
          const loaded = await loadPetHealth(ownerId);
          if (!active) return;
          setData(loaded);
          setStatus('ready');
        } catch {
          if (active) setStatus('error');
        }
      };
      void run();
      return () => {
        active = false;
      };
    }, [ownerId])
  );

  const save = useCallback(
    async (updater: (current: PetHealthData) => PetHealthData) => {
      if (!ownerId) throw new Error('ログインが必要です。');
      // Re-read before writing so edits made on another screen are not lost.
      const current = await loadPetHealth(ownerId);
      const next = updater(current);
      await savePetHealth(ownerId, next);
      setData(next);
      return next;
    },
    [ownerId]
  );

  const clearAll = useCallback(async () => {
    if (!ownerId) return;
    await clearPetHealth(ownerId);
    setData(EMPTY_PET_HEALTH);
  }, [ownerId]);

  return { data, status, save, clearAll };
}
