'use client';

import { useState } from 'react';
import { ReceiptItem, Receipt } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { nanoid } from 'nanoid';
import { Trash2, Plus, AlertTriangle, Check } from 'lucide-react';

interface BillEditorProps {
  receipt: Receipt;
  onUpdate: (receipt: Receipt) => void;
}

export default function BillEditor({ receipt, onUpdate }: BillEditorProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
    setEditingItemId(newItem.id);
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Restaurant Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-500 mb-1">Restaurant</label>
        <input
          type="text"
          value={receipt.restaurant}
          onChange={(e) => updateReceiptField('restaurant', e.target.value)}
          className="w-full text-xl font-bold border-b-2 border-gray-200 focus:border-blue-500 outline-none py-1 transition-colors"
        />
      </div>

      {/* Items List */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between text-sm font-medium text-gray-500 px-2">
          <span className="flex-1">Item</span>
          <span className="w-16 text-center">Qty</span>
          <span className="w-24 text-right">Price</span>
          <span className="w-8"></span>
        </div>

        {receipt.items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 p-2 rounded-lg ${
              item.confidence && item.confidence < 0.7
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-gray-50'
            }`}
          >
            {item.confidence && item.confidence < 0.7 && (
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}

            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              className="flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1"
              onFocus={() => setEditingItemId(item.id)}
              onBlur={() => setEditingItemId(null)}
            />

            <input
              type="number"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
              min="1"
              className="w-16 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
            />

            <div className="w-24 flex items-center justify-end">
              <span className="text-gray-400 mr-1">CHF</span>
              <input
                type="number"
                value={item.price}
                onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                step="0.05"
                min="0"
                className="w-16 text-right bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
              />
            </div>

            <button
              onClick={() => deleteItem(item.id)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Totals Section */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{formatCurrency(receipt.subtotal)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Tax / MwSt</span>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">CHF</span>
            <input
              type="number"
              value={receipt.tax}
              onChange={(e) => updateReceiptField('tax', e.target.value)}
              step="0.05"
              min="0"
              className="w-20 text-right border-b border-gray-200 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Service Fee</span>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">CHF</span>
            <input
              type="number"
              value={receipt.serviceFee}
              onChange={(e) => updateReceiptField('serviceFee', e.target.value)}
              step="0.05"
              min="0"
              className="w-20 text-right border-b border-gray-200 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Tip</span>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">CHF</span>
            <input
              type="number"
              value={receipt.tip}
              onChange={(e) => updateReceiptField('tip', e.target.value)}
              step="0.50"
              min="0"
              className="w-20 text-right border-b border-gray-200 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <span className="text-xl font-bold">{formatCurrency(receipt.total)}</span>
          </div>
          {hasMismatch && (
            <div className="flex items-center gap-2 mt-2 text-yellow-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
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
