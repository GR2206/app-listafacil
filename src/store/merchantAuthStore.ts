import { create } from 'zustand';

import {
  IS_MERCHANT_MODE,
  MERCHANT_ADMIN_PASSWORD,
  MERCHANT_ADMIN_USER,
  MERCHANT_SESSION_KEY,
} from '@/config/merchant';
import { getAppSetting, setAppSetting } from '@/db/database';

interface MerchantAuthState {
  isAuthenticated: boolean;
  isHydrated: boolean;
  canAccessMerchantPanel: boolean;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => boolean;
  logout: () => Promise<void>;
}

function computeAccess(isAuthenticated: boolean): boolean {
  return IS_MERCHANT_MODE || isAuthenticated;
}

export const useMerchantAuthStore = create<MerchantAuthState>((set, get) => ({
  isAuthenticated: false,
  isHydrated: false,
  canAccessMerchantPanel: IS_MERCHANT_MODE,

  hydrate: async () => {
    const session = await getAppSetting(MERCHANT_SESSION_KEY);
    const isAuthenticated = session === 'authenticated';
    set({
      isAuthenticated,
      isHydrated: true,
      canAccessMerchantPanel: computeAccess(isAuthenticated),
    });
  },

  login: (username, password) => {
    const normalizedUser = username.trim().toLowerCase();
    const expectedUser = MERCHANT_ADMIN_USER.trim().toLowerCase();

    if (normalizedUser !== expectedUser || password !== MERCHANT_ADMIN_PASSWORD) {
      return false;
    }

    void setAppSetting(MERCHANT_SESSION_KEY, 'authenticated');
    set({
      isAuthenticated: true,
      canAccessMerchantPanel: true,
    });
    return true;
  },

  logout: async () => {
    await setAppSetting(MERCHANT_SESSION_KEY, '');
    set({
      isAuthenticated: false,
      canAccessMerchantPanel: IS_MERCHANT_MODE,
    });
  },
}));
