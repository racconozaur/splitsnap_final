'use client';

import { useState } from 'react';
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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Calculate how much of each item is already claimed by others
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
      // Remove selection
      onSelectionChange(selections.filter(s => s.itemId !== itemId));
    } else {
      // Add full selection
      onSelectionChange([...selections, { itemId, share: 1.0 }]);
    }
  };

  const setItemShare = (itemId: string, share: number) => {
    const existing = getCurrentSelection(itemId);
    if (share <= 0) {
      // Remove selection if share is 0
      onSelectionChange(selections.filter(s => s.itemId !== itemId));
    } else if (existing) {
      // Update existing selection
      onSelectionChange(
        selections.map(s => (s.itemId === itemId ? { ...s, share } : s))
      );
    } else {
      // Add new selection
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
        const remainingShare = 1 - claims.totalShare;
        const isOverclaimed = claims.totalShare + (selection?.share || 0) > 1.01;

        return (
          <div
            key={item.id}
            className={`border rounded-lg overflow-hidden transition-all ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            } ${isLocked ? 'opacity-75' : ''}`}
          >
            {/* Item Header */}
            <button
              onClick={() => !isLocked && toggleItem(item.id)}
              disabled={isLocked}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                {item.quantity > 1 && (
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                )}
              </div>

              <span className="font-semibold text-gray-700">
                {formatCurrency(item.price)}
              </span>
            </button>

            {/* Claims info */}
            {claims.claimedBy.length > 0 && (
              <div className="px-3 pb-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>Also selected by: {claims.claimedBy.join(', ')}</span>
                </div>
              </div>
            )}

            {/* Share selector (shown when selected) */}
            {isSelected && !isLocked && (
              <div className="px-3 pb-3 border-t border-blue-100">
                <p className="text-sm text-gray-600 mt-2 mb-2">How much did you have?</p>
                <div className="flex flex-wrap gap-2">
                  {shareOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setItemShare(item.id, opt.value)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        selection.share === opt.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Custom share input */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Custom:</span>
                  <input
                    type="number"
                    value={Math.round(selection.share * 100)}
                    onChange={(e) => setItemShare(item.id, parseInt(e.target.value) / 100)}
                    min="1"
                    max="100"
                    className="w-16 px-2 py-1 text-sm border rounded"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>

                {/* Your share amount */}
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Your share: </span>
                  <span className="font-semibold">
                    {formatCurrency(item.price * selection.share)}
                  </span>
                </div>

                {/* Overclaimed warning */}
                {isOverclaimed && (
                  <div className="mt-2 flex items-center gap-1 text-yellow-600 text-sm">
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
