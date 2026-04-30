'use client';

import { ReceiptItem, ItemSelection, Participant } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { Check, Users, AlertTriangle } from 'lucide-react';

interface ItemSelectorProps {
  items: ReceiptItem[];
  participants: Participant[];
  currentParticipantId: string;
  selections: ItemSelection[];
  onSelectionChange: (selections: ItemSelection[]) => void;
  isLocked: boolean;
}

export default function ItemSelector({
  items,
  participants,
  currentParticipantId,
  selections,
  onSelectionChange,
  isLocked,
}: ItemSelectorProps) {
  const getItemClaims = (itemId: string) => {
    let totalShare = 0;
    const claimedBy: string[] = [];

    for (const participant of participants) {
      if (participant.id === currentParticipantId) continue;
      for (const sel of participant.selections) {
        if (sel.itemId === itemId) {
          totalShare += sel.share;
          claimedBy.push(participant.name);
        }
      }
    }

    return { totalShare, claimedBy };
  };

  const getCurrentSelection = (itemId: string): ItemSelection | undefined => {
    return selections.find(s => s.itemId === itemId);
  };

  const toggleItem = (itemId: string) => {
    const existing = getCurrentSelection(itemId);
    if (existing) {
      onSelectionChange(selections.filter(s => s.itemId !== itemId));
    } else {
      onSelectionChange([...selections, { itemId, share: 1.0 }]);
    }
  };

  const setItemShare = (itemId: string, share: number) => {
    const existing = getCurrentSelection(itemId);
    if (share <= 0) {
      onSelectionChange(selections.filter(s => s.itemId !== itemId));
    } else if (existing) {
      onSelectionChange(
        selections.map(s => (s.itemId === itemId ? { ...s, share } : s))
      );
    } else {
      onSelectionChange([...selections, { itemId, share }]);
    }
  };

  const shareOptions = [
    { value: 1.0, label: 'Full item' },
    { value: 0.5, label: 'Half (1/2)' },
    { value: 0.33, label: 'Third (1/3)' },
    { value: 0.25, label: 'Quarter (1/4)' },
    { value: 0.2, label: 'Fifth (1/5)' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const selection = getCurrentSelection(item.id);
        const isSelected = !!selection;
        const claims = getItemClaims(item.id);
        const isOverclaimed = claims.totalShare + (selection?.share || 0) > 1.01;

        return (
          <div
            key={item.id}
            className={`overflow-hidden rounded-xl border transition-all ${
              isSelected ? 'border-[#0f766e] bg-[#eef7f2]' : 'border-[#e3e3d8] bg-white'
            } ${isLocked ? 'opacity-75' : ''}`}
          >
            <button
              onClick={() => !isLocked && toggleItem(item.id)}
              disabled={isLocked}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected
                    ? 'border-[#0f766e] bg-[#0f766e]'
                    : 'border-[#b8b8aa]'
                }`}
              >
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-[#171717]">{item.name}</p>
                {item.quantity > 1 && (
                  <p className="text-sm text-[#77776c]">Qty: {item.quantity}</p>
                )}
              </div>

              <span className="font-semibold text-[#171717]">
                {formatCurrency(item.price)}
              </span>
            </button>

            {claims.claimedBy.length > 0 && (
              <div className="px-3 pb-2">
                <div className="flex items-center gap-1 text-xs text-[#5d5d53]">
                  <Users className="w-3 h-3" />
                  <span>Also selected by: {claims.claimedBy.join(', ')}</span>
                </div>
              </div>
            )}

            {isSelected && !isLocked && (
              <div className="border-t border-[#d8d8ce] px-3 pb-3">
                <p className="mb-2 mt-3 text-sm font-medium text-[#5d5d53]">How much did you have?</p>
                <div className="flex flex-wrap gap-2">
                  {shareOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setItemShare(item.id, opt.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        selection.share === opt.value
                          ? 'bg-[#171717] text-white'
                          : 'bg-white text-[#33332e] ring-1 ring-[#d8d8ce] hover:ring-[#171717]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-[#5d5d53]">Custom:</span>
                  <input
                    type="number"
                    value={Math.round(selection.share * 100)}
                    onChange={(e) => setItemShare(item.id, parseInt(e.target.value) / 100)}
                    min="1"
                    max="100"
                    className="w-16 rounded border border-[#d8d8ce] px-2 py-1 text-sm text-[#171717] outline-none focus:border-[#171717]"
                  />
                  <span className="text-sm text-[#5d5d53]">%</span>
                </div>

                <div className="mt-2 text-sm">
                  <span className="text-[#5d5d53]">Your share: </span>
                  <span className="font-semibold text-[#171717]">
                    {formatCurrency(item.price * selection.share)}
                  </span>
                </div>

                {isOverclaimed && (
                  <div className="mt-2 flex items-center gap-1 text-sm text-[#b57905]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>This item is over 100% claimed!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
//made with Bob
