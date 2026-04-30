'use client';

import QRCode from 'react-qr-code';
import { PaymentInfo } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { CreditCard, Banknote } from 'lucide-react';
import { ui } from '@/lib/ui';

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

  const twintContent = `Pay ${payerName}
${formatCurrency(amount)}
${paymentInfo.twintPhone || 'Phone number not provided'}
Reason: ${reason}`;

  const revolutLink = paymentInfo.revolutTag
    ? buildRevolutPaymentLink(paymentInfo.revolutTag, amount, reason)
    : '';
  const revolutContent = revolutLink
    ? revolutLink
    : `Pay ${payerName}
${formatCurrency(amount)}
via Revolut
Reason: ${reason}`;

  const preferredMethod = paymentInfo.preferredMethod;

  return (
    <div className={`${ui.panel} p-5 sm:p-6`}>
      <h3 className="mb-4 text-center text-lg font-semibold text-[#171717]">
        Pay {formatCurrency(amount)}
      </h3>

      <div className="space-y-6">
        {(preferredMethod === 'twint' || paymentInfo.twintPhone) && (
          <div className="rounded-xl border border-[#e3e3d8] bg-[#fbfbf7] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">T</span>
              </div>
              <span className="font-semibold text-[#171717]">TWINT</span>
            </div>

            <div className="flex justify-center mb-4">
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <QRCode
                  value={twintContent}
                  size={160}
                  level="M"
                />
              </div>
            </div>

            <div className="text-center text-sm text-[#5d5d53]">
              <p className="font-semibold text-[#171717]">{paymentInfo.twintPhone || 'No phone provided'}</p>
              <p className="mt-1 text-[#5d5d53]">Scan to pay via TWINT</p>
            </div>
          </div>
        )}

        {(preferredMethod === 'revolut' || paymentInfo.revolutTag) && (
          <div className="rounded-xl border border-[#e3e3d8] bg-[#fbfbf7] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#171717]">
                <span className="text-white text-xs font-bold">R</span>
              </div>
              <span className="font-semibold text-[#171717]">Revolut</span>
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

            <div className="text-center text-sm text-[#5d5d53]">
              <p className="font-semibold text-[#171717]">@{paymentInfo.revolutTag || 'No tag provided'}</p>
              <p className="mt-1 text-[#5d5d53]">
                Opens Revolut with amount and reference where supported.
              </p>
              {revolutLink && (
                <a
                  href={revolutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-[#171717] px-4 py-3 font-semibold text-white hover:bg-[#30302b]"
                >
                  Pay with Revolut
                </a>
              )}
            </div>
          </div>
        )}

        {(preferredMethod === 'iban' || paymentInfo.iban) && paymentInfo.iban && (
          <div className="rounded-xl border border-[#e3e3d8] bg-[#fbfbf7] p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-[#33332e]" />
              <span className="font-semibold text-[#171717]">Bank Transfer</span>
            </div>

            <div className="break-all rounded bg-white p-3 font-mono text-sm text-[#171717] ring-1 ring-[#e3e3d8]">
              {paymentInfo.iban}
            </div>

            <div className="mt-3 space-y-1 text-sm text-[#5d5d53]">
              <p><span className="font-medium">Amount:</span> {formatCurrency(amount)}</p>
              <p><span className="font-medium">Recipient:</span> {payerName}</p>
              <p><span className="font-medium">Reference:</span> {reason}</p>
            </div>
          </div>
        )}

        {preferredMethod === 'cash' && (
          <div className="rounded-xl border border-[#e3e3d8] bg-[#fbfbf7] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="h-5 w-5 text-[#0f766e]" />
              <span className="font-semibold text-[#171717]">Cash Payment</span>
            </div>

            <div className="text-center py-4">
              <p className="mb-2 text-2xl font-semibold text-[#0f766e]">
                {formatCurrency(amount)}
              </p>
              <p className="text-[#5d5d53]">
                Pay <span className="font-medium">{payerName}</span> in cash
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-[#77776c]">
        Payment reference: {reason}
      </p>
    </div>
  );
}

function buildRevolutPaymentLink(revolutTag: string, amount: number, message: string): string {
  const cleanTag = revolutTag.trim().replace(/^@/, '');
  const url = new URL(`https://revolut.me/${cleanTag}`);
  url.searchParams.set('amount', amount.toFixed(2));
  url.searchParams.set('currency', 'CHF');
  url.searchParams.set('message', message);
  return url.toString();
}
//made with Bob
