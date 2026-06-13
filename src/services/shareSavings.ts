import { Platform, Share } from 'react-native';

import { buildShareInvitationBlock, SHARE_INVITATION_TITLE } from '@/config/appLinks';
import { getAppSetting } from '@/db/database';
import { incrementSupermarketRanking } from '@/services/supermarketRanking';
import { formatCurrency } from '@/utils/formatCurrency';

export interface ShareSavingsPayload {
  supermarketId: string;
  supermarketName: string;
  total: number;
  listSavings: number;
}

function buildShareMessage(payload: ShareSavingsPayload): string {
  const invitation = buildShareInvitationBlock();

  if (payload.listSavings > 0) {
    return (
      `¡Ahorré ${formatCurrency(payload.listSavings)} en mi compra de ${formatCurrency(payload.total)} en ${payload.supermarketName}! 🛒🔥\n\n` +
      invitation
    );
  }

  return (
    `Terminé mi compra en ${payload.supermarketName} por ${formatCurrency(payload.total)}. 🛒🔥\n\n` +
    invitation
  );
}

export async function sharePurchaseSavings(
  payload: ShareSavingsPayload
): Promise<boolean> {
  try {
    const message = buildShareMessage(payload);
    const result = await Share.share(
      Platform.OS === 'android'
        ? { message, title: SHARE_INVITATION_TITLE }
        : { message }
    );

    const shared =
      result.action === Share.sharedAction ||
      (result.action as string) === 'sharedAction';

    if (!shared) return false;

    const zone = await getAppSetting('selected_zone');
    await incrementSupermarketRanking(payload.supermarketId, zone, 'share');
    return true;
  } catch {
    return false;
  }
}
