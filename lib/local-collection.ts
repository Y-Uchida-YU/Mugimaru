import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Small AsyncStorage-backed set of string ids.
 * Used for device-local collections such as event RSVPs where a
 * full backend table is not required for the current PoC scope.
 */
export function useStoredIdSet(storageKey: string) {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setIds(new Set(parsed.filter((item): item is string => typeof item === 'string')));
        }
      } catch {
        // no-op
      } finally {
        if (active) setHydrated(true);
      }
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [storageKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => {});
    },
    [storageKey]
  );

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { ids, has, toggle, hydrated };
}
