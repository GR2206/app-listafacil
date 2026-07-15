import { useEffect, useMemo, useState } from 'react';

import { getAppSetting } from '@/db/database';
import { SELECTED_ZONE_SETTING_KEY } from '@/config/zones';
import {
  fetchPromosBancariasManifest,
  getStartupPromosBancariasManifest,
} from '@/services/promosBancariasManager';
import type { PromoBancariaItem } from '@/types/promosBancarias';
import {
  buildCartPromoTipMessage,
  estimateListPromoReturn,
  findBestPromoForSupermarket,
} from '@/utils/cartBankPromoTip';
import { formatPesosAR } from '@/utils/promoAhorroPesos';

export type CartBankPromoTip = {
  promo: PromoBancariaItem;
  message: string;
  /** Ej: "Sobre tu lista, hasta $3.200" */
  estimateLabel: string | null;
};

export function useCartBankPromoTip(options: {
  supermarketId: string;
  supermarketName: string;
  listTotal: number;
}): CartBankPromoTip | null {
  const { supermarketId, supermarketName, listTotal } = options;
  const [zone, setZone] = useState<string | null>(null);
  const [promosReady, setPromosReady] = useState(
    () => getStartupPromosBancariasManifest() != null
  );

  useEffect(() => {
    void getAppSetting(SELECTED_ZONE_SETTING_KEY).then(setZone);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await fetchPromosBancariasManifest();
      if (!cancelled) setPromosReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (!promosReady || !supermarketId) return null;
    const manifest = getStartupPromosBancariasManifest();
    const promo = findBestPromoForSupermarket(manifest, supermarketId, zone);
    if (!promo) return null;

    const estimate = estimateListPromoReturn(promo, listTotal);
    return {
      promo,
      message: buildCartPromoTipMessage(promo, supermarketName),
      estimateLabel:
        estimate != null ? `Sobre tu lista, hasta ${formatPesosAR(estimate)}` : null,
    };
  }, [promosReady, supermarketId, supermarketName, listTotal, zone]);
}
