import { ReceiptItem, ItemSelection, CalculatedAmount, Session, Participant } from '@/types';

export function calculateParticipantAmount(
  selections: ItemSelection[],
  session: Session
): CalculatedAmount {
  const { items, subtotal, tax, tip, serviceFee } = session;

  let itemsTotal = 0;
  for (const selection of selections) {
    const item = items.find(i => i.id === selection.itemId);
    if (item) {
      itemsTotal += item.price * selection.share;
    }
  }

  const proportion = subtotal > 0 ? itemsTotal / subtotal : 0;

  const taxShare = tax * proportion;
  const tipShare = tip * proportion;
  const serviceFeeShare = serviceFee * proportion;

  const total = itemsTotal + taxShare + tipShare + serviceFeeShare;

  return {
    itemsTotal: roundToTwoDecimals(itemsTotal),
    taxShare: roundToTwoDecimals(taxShare),
    tipShare: roundToTwoDecimals(tipShare),
    serviceFeeShare: roundToTwoDecimals(serviceFeeShare),
    total: roundToTwoDecimals(total),
  };
}

export function calculateItemClaims(
  participants: Participant[]
): Map<string, { totalShare: number; claimedBy: string[] }> {
  const claims = new Map<string, { totalShare: number; claimedBy: string[] }>();

  for (const participant of participants) {
    for (const selection of participant.selections) {
      const existing = claims.get(selection.itemId) || { totalShare: 0, claimedBy: [] };
      existing.totalShare += selection.share;
      existing.claimedBy.push(participant.name);
      claims.set(selection.itemId, existing);
    }
  }

  return claims;
}

export function calculateUnclaimedAmount(
  session: Session,
  participants: Participant[]
): number {
  const totalClaimed = participants.reduce((sum, p) => sum + p.amountOwed, 0);
  return roundToTwoDecimals(session.total - totalClaimed);
}

export function validateReceiptTotals(
  items: ReceiptItem[],
  subtotal: number,
  tax: number,
  tip: number,
  serviceFee: number,
  total: number
): { isValid: boolean; difference: number; calculatedTotal: number } {
  const itemsSum = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculatedTotal = itemsSum + tax + tip + serviceFee;
  const difference = Math.abs(calculatedTotal - total);

  return {
    isValid: difference < 0.02,
    difference: roundToTwoDecimals(difference),
    calculatedTotal: roundToTwoDecimals(calculatedTotal),
  };
}

export function checkClaimConflicts(
  participants: Participant[],
  items: ReceiptItem[]
): Array<{ itemId: string; itemName: string; totalShare: number; claimedBy: string[] }> {
  const claims = calculateItemClaims(participants);
  const conflicts: Array<{ itemId: string; itemName: string; totalShare: number; claimedBy: string[] }> = [];

  claims.forEach((claim, itemId) => {
    if (claim.totalShare > 1.01) {
      const item = items.find(i => i.id === itemId);
      conflicts.push({
        itemId,
        itemName: item?.name || 'Unknown',
        totalShare: claim.totalShare,
        claimedBy: claim.claimedBy,
      });
    }
  });

  return conflicts;
}

export function splitUnclaimedEqually(
  unclaimedAmount: number,
  participantCount: number
): number {
  if (participantCount === 0) return 0;
  return roundToTwoDecimals(unclaimedAmount / participantCount);
}

export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return `CHF ${amount.toFixed(2)}`;
}

export function generateSessionSummary(
  session: Session,
  participants: Participant[]
) {
  const totalClaimed = participants.reduce((sum, p) => sum + p.amountOwed, 0);
  const totalPaid = participants
    .filter(p => p.paymentStatus === 'paid' || p.paymentStatus === 'confirmed')
    .reduce((sum, p) => sum + p.amountOwed, 0);

  return {
    totalBill: session.total,
    totalClaimed: roundToTwoDecimals(totalClaimed),
    totalUnclaimed: roundToTwoDecimals(session.total - totalClaimed),
    totalPaid: roundToTwoDecimals(totalPaid),
    totalRemaining: roundToTwoDecimals(session.total - totalPaid),
    participantCount: participants.length,
    paidCount: participants.filter(p => p.paymentStatus === 'paid' || p.paymentStatus === 'confirmed').length,
  };
}
//made with Bob
