import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initOneSignal, loginOneSignal, logoutOneSignal } from '@/lib/onesignal';

/**
 * Boots OneSignal once on app load (when push_enabled), and binds/unbinds
 * the external_id on auth state changes so notifications can target users.
 */
export function useOneSignalBoot() {
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const ok = await initOneSignal();
      if (!ok || !mounted) return;
      if (user?.id) {
        loginOneSignal(user.id);
      } else {
        logoutOneSignal();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);
}
