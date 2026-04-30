'use client';

import { ReceiptItem, Receipt } from '@/types';
import { formatCurrency } from '@/lib/calculations';
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
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
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
        <div className="hidden sm:flex items-center justify-between text-sm font-medium text-gray-500 px-2">
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
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-gray-50'
            }`}
          >
            {item.confidence && item.confidence < 0.7 && (
              <AlertTriangle className="hidden sm:block w-4 h-4 text-yellow-500 self-center" />
            )}

            <div className={`${item.confidence && item.confidence < 0.7 ? 'sm:col-start-2' : 'sm:col-start-1 sm:col-span-2'} min-w-0`}>
              <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">Item</label>
              <div className="flex items-center gap-2">
                {item.confidence && item.confidence < 0.7 && (
                  <AlertTriangle className="sm:hidden w-4 h-4 text-yellow-500 flex-shrink-0" />
                )}
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  className="w-full min-w-0 bg-white sm:bg-transparent border border-gray-200 sm:border-b sm:border-x-0 sm:border-t-0 sm:border-transparent rounded-lg sm:rounded-none px-3 sm:px-1 py-2 sm:py-0 hover:border-gray-300 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="sm:col-start-3">
              <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">Qty</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-20 sm:w-16 text-center bg-white sm:bg-transparent border border-gray-200 sm:border-b sm:border-x-0 sm:border-t-0 sm:border-transparent rounded-lg sm:rounded-none px-2 py-2 sm:py-0 hover:border-gray-300 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1 sm:col-start-4">
              <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">Unit price</label>
              <div className="flex items-center rounded-lg sm:rounded-none border border-gray-200 sm:border-0 bg-white sm:bg-transparent px-3 sm:px-0 py-2 sm:py-0">
                <span className="text-gray-400 mr-2 sm:mr-1">CHF</span>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                  step="0.05"
                  min="0"
                  className="w-full sm:w-16 text-right bg-transparent border-0 sm:border-b sm:border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => deleteItem(item.id)}
              aria-label={`Delete ${item.name}`}
              className="col-start-2 row-start-1 sm:col-start-5 sm:row-start-auto justify-self-end self-start sm:self-center w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
