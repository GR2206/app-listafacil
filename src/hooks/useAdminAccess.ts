import { IS_ADMIN } from '@/config/admin';
import { useMerchantAuthStore } from '@/store/merchantAuthStore';

/** Solo admins autenticados (login comerciante) pueden abrir el panel de revisión. */
export function useAdminAccess(): boolean {
  const canAccessMerchantPanel = useMerchantAuthStore((s) => s.canAccessMerchantPanel);
  const isHydrated = useMerchantAuthStore((s) => s.isHydrated);
  return IS_ADMIN && isHydrated && canAccessMerchantPanel;
}
