'use client';

import { ReceiptItem, Receipt } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { ui } from '@/lib/ui';
import { nanoid } from 'nanoid';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';

interface BillEditorProps {
  receipt: Receipt;
  onUpdate: (receipt: Receipt) => void;
}

export default function BillEditor({ receipt, onUpdate }: BillEditorProps) {
  const updateItem = (itemId: string, updates: Partial<ReceiptItem>) => {
    const newItems = receipt.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    const newSubtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newTotal = newSubtotal + receipt.tax + receipt.tip + receipt.serviceFee;
    onUpdate({
      ...receipt,
      items: newItems,
      subtotal: Math.round(newSubtotal * 100) / 100,
      total: Math.round(newTotal * 100) / 100,
    });
  };

  const deleteItem = (itemId: string) => {
    const newItems = receipt.items.filter(item => item.id !== itemId);
    const newSubtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newTotal = newSubtotal + receipt.tax + receipt.tip + receipt.serviceFee;
    onUpdate({
      ...receipt,
      items: newItems,
      subtotal: Math.round(newSubtotal * 100) / 100,
      total: Math.round(newTotal * 100) / 100,
    });
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      id: nanoid(8),
      name: 'New Item',
      quantity: 1,
      price: 0,
      isShared: false,
      confidence: 1,
    };
    const newItems = [...receipt.items, newItem];
    onUpdate({
      ...receipt,
      items: newItems,
    });
  };

  const updateReceiptField = (field: keyof Receipt, value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    if (field === 'tax' || field === 'tip' || field === 'serviceFee') {
      const newTotal = receipt.subtotal +
        (field === 'tax' ? numValue : receipt.tax) +
        (field === 'tip' ? numValue : receipt.tip) +
        (field === 'serviceFee' ? numValue : receipt.serviceFee);
      onUpdate({
        ...receipt,
        [field]: Math.round(numValue * 100) / 100,
        total: Math.round(newTotal * 100) / 100,
      });
    } else {
      onUpdate({
        ...receipt,
        [field]: typeof value === 'string' ? value : Math.round(numValue * 100) / 100,
      });
    }
  };

  const calculatedTotal = receipt.subtotal + receipt.tax + receipt.tip + receipt.serviceFee;
  const hasMismatch = Math.abs(calculatedTotal - receipt.total) > 0.02;

  return (
    <div className={`${ui.panel} p-4 sm:p-6`}>
      {/* Restaurant Name */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-semibold text-[#5d5d53]">Restaurant</label>
        <input
          type="text"
          value={receipt.restaurant}
          onChange={(e) => updateReceiptField('restaurant', e.target.value)}
          className="w-full border-b-2 border-[#d8d8ce] bg-transparent py-1 text-xl font-semibold text-[#171717] outline-none transition-colors focus:border-[#171717]"
        />
      </div>

      {/* Items List */}
      <div className="space-y-2 mb-6">
        <div className="hidden items-center justify-between px-2 text-sm font-semibold text-[#77776c] sm:flex">
          <span className="flex-1">Item</span>
          <span className="w-16 text-center">Qty</span>
          <span className="w-24 text-right">Price</span>
          <span className="w-8"></span>
        </div>

        {receipt.items.map((item) => (
          <div
            key={item.id}
            className={`grid grid-cols-[1fr_auto] sm:grid-cols-[auto_minmax(0,1fr)_4rem_7rem_2rem] gap-3 sm:gap-2 p-3 sm:p-2 rounded-lg ${
              item.confidence && item.confidence < 0.7
                ? 'border border-[#f2d37b] bg-[#fff8df]'
                : 'border border-[#e3e3d8] bg-[#fbfbf7]'
            }`}
          >
            {item.confidence && item.confidence < 0.7 && (
              <AlertTriangle className="hidden h-4 w-4 self-center text-[#b57905] sm:block" />
            )}

            <div className={`${item.confidence && item.confidence < 0.7 ? 'sm:col-start-2' : 'sm:col-start-1 sm:col-span-2'} min-w-0`}>
              <label className="mb-1 block text-xs font-semibold text-[#77776c] sm:hidden">Item</label>
              <div className="flex items-center gap-2">
                {item.confidence && item.confidence < 0.7 && (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[#b57905] sm:hidden" />
                )}
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  className="w-full min-w-0 rounded-lg border border-[#d8d8ce] bg-white px-3 py-2 text-[#171717] outline-none hover:border-[#b8b8aa] focus:border-[#171717] sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-transparent sm:bg-transparent sm:px-1 sm:py-0"
                />
              </div>
            </div>

            <div className="sm:col-start-3">
              <label className="mb-1 block text-xs font-semibold text-[#77776c] sm:hidden">Qty</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-20 rounded-lg border border-[#d8d8ce] bg-white px-2 py-2 text-center text-[#171717] outline-none hover:border-[#b8b8aa] focus:border-[#171717] sm:w-16 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-transparent sm:bg-transparent sm:py-0"
              />
            </div>

            <div className="col-span-2 sm:col-span-1 sm:col-start-4">
              <label className="mb-1 block text-xs font-semibold text-[#77776c] sm:hidden">Unit price</label>
              <div className="flex items-center rounded-lg border border-[#d8d8ce] bg-white px-3 py-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                <span className="mr-2 text-[#77776c] sm:mr-1">CHF</span>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                  step="0.05"
                  min="0"
                  className="w-full border-0 bg-transparent text-right text-[#171717] outline-none hover:border-[#b8b8aa] focus:border-[#171717] sm:w-16 sm:border-b sm:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => deleteItem(item.id)}
              aria-label={`Delete ${item.name}`}
              className="col-start-2 row-start-1 flex h-9 w-9 items-center justify-center justify-self-end rounded text-[#77776c] transition-colors hover:bg-[#ffe8e8] hover:text-[#b42318] sm:col-start-5 sm:row-start-auto sm:h-8 sm:w-8 sm:self-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={addItem}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#d8d8ce] p-3 font-semibold text-[#5d5d53] transition-colors hover:border-[#171717] hover:text-[#171717]"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Totals Section */}
      <div className="space-y-3 border-t border-[#e3e3d8] pt-4">
        <div className="flex justify-between items-center">
          <span className="text-[#5d5d53]">Subtotal</span>
          <span className="font-medium">{formatCurrency(receipt.subtotal)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#5d5d53]">Tax / MwSt</span>
          <div className="flex items-center">
            <span className="mr-1 text-[#77776c]">CHF</span>
            <input
              type="number"
              value={receipt.tax}
              onChange={(e) => updateReceiptField('tax', e.target.value)}
              step="0.05"
              min="0"
              className="w-20 border-b border-[#d8d8ce] text-right outline-none focus:border-[#171717]"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#5d5d53]">Service Fee</span>
          <div className="flex items-center">
            <span className="mr-1 text-[#77776c]">CHF</span>
            <input
              type="number"
              value={receipt.serviceFee}
              onChange={(e) => updateReceiptField('serviceFee', e.target.value)}
              step="0.05"
              min="0"
              className="w-20 border-b border-[#d8d8ce] text-right outline-none focus:border-[#171717]"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#5d5d53]">Tip</span>
          <div className="flex items-center">
            <span className="mr-1 text-[#77776c]">CHF</span>
            <input
              type="number"
              value={receipt.tip}
              onChange={(e) => updateReceiptField('tip', e.target.value)}
              step="0.50"
              min="0"
              className="w-20 border-b border-[#d8d8ce] text-right outline-none focus:border-[#171717]"
            />
          </div>
        </div>

        <div className="border-t border-[#e3e3d8] pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <span className="text-xl font-bold">{formatCurrency(receipt.total)}</span>
          </div>
          {hasMismatch && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[#b57905]">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Calculated total ({formatCurrency(calculatedTotal)}) differs from stated total
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
