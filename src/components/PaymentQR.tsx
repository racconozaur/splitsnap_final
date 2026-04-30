'use client';

import QRCode from 'react-qr-code';
import { PaymentInfo } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { Smartphone, CreditCard, Banknote } from 'lucide-react';

interface PaymentQRProps {
  paymentInfo: PaymentInfo;
  amount: number;
  payerName: string;
  participantName: string;
  restaurantName: string;
}

export default function PaymentQR({
  paymentInfo,
  amount,
  payerName,
  participantName,
  restaurantName,
}: PaymentQRProps) {
  const reason = `Bill split - ${restaurantName} (${participantName})`;

  // Generate TWINT QR content
  // TWINT doesn't have a public API, so we create a text-based QR for manual payment
  const twintContent = `Pay ${payerName}
${formatCurrency(amount)}
${paymentInfo.twintPhone || 'Phone number not provided'}
Reason: ${reason}`;

  // Generate Revolut payment link content
  // Revolut.me links support amount parameter
  const revolutContent = paymentInfo.revolutTag
    ? `https://revolut.me/${paymentInfo.revolutTag}?amount=${amount}&currency=CHF&message=${encodeURIComponent(reason)}`
    : `Pay ${payerName}
${formatCurrency(amount)}
via Revolut
Reason: ${reason}`;

  const preferredMethod = paymentInfo.preferredMethod;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-center mb-4">
        Pay {formatCurrency(amount)}
      </h3>

      <div className="space-y-6">
        {/* TWINT QR */}
        {(preferredMethod === 'twint' || paymentInfo.twintPhone) && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">T</span>
              </div>
              <span className="font-semibold">TWINT</span>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <QRCode
                  value={twintContent}
                  size={160}
                  level="M"
                />
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p className="font-medium">{paymentInfo.twintPhone || 'No phone provided'}</p>
              <p className="text-gray-500 mt-1">Scan to pay via TWINT</p>
            </div>
          </div>
        )}

        {/* Revolut QR */}
        {(preferredMethod === 'revolut' || paymentInfo.revolutTag) && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">R</span>
              </div>
              <span className="font-semibold">Revolut</span>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <QRCode
                  value={revolutContent}
                  size={160}
                  level="M"
                />
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p className="font-medium">@{paymentInfo.revolutTag || 'No tag provided'}</p>
              <p className="text-gray-500 mt-1">Scan to pay via Revolut</p>
              {paymentInfo.revolutTag && (
                <a
                  href={`https://revolut.me/${paymentInfo.revolutTag}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mt-2 inline-block"
                >
                  Open Revolut Link
                </a>
              )}
            </div>
          </div>
        )}

        {/* IBAN Info */}
        {(preferredMethod === 'iban' || paymentInfo.iban) && paymentInfo.iban && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-gray-700" />
              <span className="font-semibold">Bank Transfer</span>
            </div>

            <div className="bg-gray-50 rounded p-3 text-sm font-mono break-all">
              {paymentInfo.iban}
            </div>

            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Amount:</span> {formatCurrency(amount)}</p>
              <p><span className="font-medium">Recipient:</span> {payerName}</p>
              <p><span className="font-medium">Reference:</span> {reason}</p>
            </div>
          </div>
        )}

        {/* Cash Option */}
        {preferredMethod === 'cash' && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-5 h-5 text-green-600" />
              <span className="font-semibold">Cash Payment</span>
            </div>

            <div className="text-center py-4">
              <p className="text-2xl font-bold text-green-600 mb-2">
                {formatCurrency(amount)}
              </p>
              <p className="text-gray-600">
                Pay <span className="font-medium">{payerName}</span> in cash
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Payment reference: {reason}
      </p>
    </div>
  );
}
