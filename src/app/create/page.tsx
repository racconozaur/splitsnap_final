'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt, PaymentInfo } from '@/types';
import ReceiptScanner from '@/components/ReceiptScanner';
import BillEditor from '@/components/BillEditor';
import { ui } from '@/lib/ui';
import { ArrowLeft, ArrowRight, Loader2, Share2 } from 'lucide-react';
import QRCode from 'react-qr-code';

type Step = 'scan' | 'edit' | 'payment' | 'share';

export default function CreatePage() {
  const [step, setStep] = useState<Step>('scan');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [payerName, setPayerName] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    preferredMethod: 'twint',
    twintPhone: '',
    revolutTag: '',
    iban: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanComplete = (scannedReceipt: Receipt) => {
    setReceipt(scannedReceipt);
    setStep('edit');
  };

  const handleCreateSession = async () => {
    if (!receipt || !payerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: receipt.restaurant,
          payerName: payerName.trim(),
          payerPaymentInfo: paymentInfo,
          items: receipt.items,
          subtotal: receipt.subtotal,
          tax: receipt.tax,
          tip: receipt.tip,
          serviceFee: receipt.serviceFee,
          total: receipt.total,
          numberOfPeople,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setShareUrl(data.shareUrl);
      setStep('share');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      <header className="sticky top-0 z-10 border-b border-[#e3e3d8] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:py-4">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#5d5d53] hover:text-[#171717]">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="px-3 text-center text-base font-semibold text-[#171717] sm:text-lg">
            {step === 'scan' && 'Scan Receipt'}
            {step === 'edit' && 'Edit Bill'}
            {step === 'payment' && 'Payment Info'}
            {step === 'share' && 'Share with Friends'}
          </h1>
          <div className="w-8 sm:w-16" />
        </div>

        <div className="h-1 bg-[#d8d8ce]">
          <div
            className="h-full bg-[#0f766e] transition-all duration-300"
            style={{
              width: step === 'scan' ? '25%' : step === 'edit' ? '50%' : step === 'payment' ? '75%' : '100%',
            }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-5 sm:px-4 sm:py-8">
        {step === 'scan' && (
          <div>
            <ReceiptScanner onScanComplete={handleScanComplete} />

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setReceipt({
                    restaurant: 'Demo Restaurant',
                    items: [
                      { id: '1', name: 'Margherita Pizza', quantity: 1, price: 18.50, isShared: false, confidence: 0.95 },
                      { id: '2', name: 'Coca Cola', quantity: 2, price: 5.00, isShared: false, confidence: 0.9 },
                      { id: '3', name: 'Caesar Salad', quantity: 1, price: 12.00, isShared: false, confidence: 0.85 },
                      { id: '4', name: 'Tiramisu', quantity: 1, price: 8.50, isShared: false, confidence: 0.9 },
                      { id: '5', name: 'House Wine (bottle)', quantity: 1, price: 35.00, isShared: true, confidence: 0.8 },
                    ],
                    subtotal: 79.00,
                    tax: 6.32,
                    tip: 0,
                    serviceFee: 0,
                    total: 85.32,
                  });
                  setStep('edit');
                }}
                className="text-sm font-semibold text-[#0f766e] hover:underline"
              >
                Try with demo receipt
              </button>
            </div>
          </div>
        )}

        {step === 'edit' && receipt && (
          <div>
            <BillEditor receipt={receipt} onUpdate={setReceipt} />

            <div className="mt-6 flex justify-end px-1">
              <button
                onClick={() => setStep('payment')}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#171717] px-6 py-3 font-medium text-white transition-colors hover:bg-[#30302b] sm:w-auto"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className={`${ui.panel} p-4 sm:p-6`}>
            <h2 className="mb-6 text-xl font-semibold text-[#171717]">Your details</h2>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-[#5d5d53]">
                Your name *
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Enter your name"
                className={ui.input}
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-[#5d5d53]">
                Number of people
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setNumberOfPeople(Math.max(2, numberOfPeople - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d8ce] bg-white text-xl font-semibold text-[#171717] transition-colors hover:border-[#171717]"
                >
                  -
                </button>
                <span className="w-8 text-center text-2xl font-semibold text-[#171717]">{numberOfPeople}</span>
                <button
                  onClick={() => setNumberOfPeople(numberOfPeople + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d8ce] bg-white text-xl font-semibold text-[#171717] transition-colors hover:border-[#171717]"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-[#5d5d53]">
                Preferred payment method
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {['twint', 'revolut', 'iban', 'cash'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentInfo({ ...paymentInfo, preferredMethod: method as PaymentInfo['preferredMethod'] })}
                    className={`rounded-lg border-2 p-3 text-left transition-colors sm:p-4 ${
                      paymentInfo.preferredMethod === method
                        ? 'border-[#0f766e] bg-[#eef7f2] text-[#171717]'
                        : 'border-[#e3e3d8] bg-white text-[#33332e] hover:border-[#171717]'
                    }`}
                  >
                    <span className="font-medium capitalize">{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentInfo.preferredMethod === 'twint' && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-[#5d5d53]">
                  TWINT phone number
                </label>
                <input
                  type="tel"
                  value={paymentInfo.twintPhone || ''}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, twintPhone: e.target.value })}
                  placeholder="+41 79 123 45 67"
                  className={ui.input}
                />
              </div>
            )}

            {paymentInfo.preferredMethod === 'revolut' && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-[#5d5d53]">
                  Revolut username
                </label>
                <div className="flex items-center">
                  <span className="rounded-l-lg border border-r-0 border-[#d8d8ce] bg-[#efefe7] px-4 py-3 text-[#5d5d53]">
                    @
                  </span>
                  <input
                    type="text"
                    value={paymentInfo.revolutTag || ''}
                    onChange={(e) => setPaymentInfo({ ...paymentInfo, revolutTag: e.target.value })}
                    placeholder="yourname"
                    className="min-w-0 flex-1 rounded-r-lg border border-[#d8d8ce] px-4 py-3 text-[#171717] outline-none focus:border-[#171717]"
                  />
                </div>
              </div>
            )}

            {paymentInfo.preferredMethod === 'iban' && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-[#5d5d53]">
                  IBAN
                </label>
                <input
                  type="text"
                  value={paymentInfo.iban || ''}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, iban: e.target.value })}
                  placeholder="CH93 0076 2011 6238 5295 7"
                  className={`${ui.input} font-mono`}
                />
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-lg border border-[#fecaca] bg-[#fff1f1] p-4 text-[#b42318]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setStep('edit')}
                className={ui.secondaryButton}
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCreateSession}
                disabled={isCreating || !payerName.trim()}
                className={`flex-1 ${ui.primaryButton}`}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Split Link
                    <Share2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'share' && shareUrl && (
          <div className="text-center">
            <div className={`${ui.panel} mb-6 p-5 sm:p-8`}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f3ee]">
                <svg className="h-8 w-8 text-[#0f766e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="mb-2 text-2xl font-semibold text-[#171717]">
                Your split link is ready!
              </h2>
              <p className="mb-6 text-[#5d5d53]">
                Share this link with your friends so they can select their items
              </p>

              <div className="flex justify-center mb-6">
                <div className="rounded-xl border border-[#e3e3d8] bg-white p-4 shadow-sm">
                  <QRCode value={shareUrl} size={180} />
                </div>
              </div>

              <div className="mb-6 rounded-lg bg-[#fbfbf7] p-3 ring-1 ring-[#e3e3d8] sm:p-4">
                <p className="mb-2 text-sm font-semibold text-[#5d5d53]">Share link:</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="min-w-0 flex-1 rounded-lg border border-[#d8d8ce] bg-white px-3 py-2 font-mono text-sm text-[#171717] sm:px-4"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="rounded-lg bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#30302b]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={() => {
                    navigator.share({
                      title: 'SplitSnap - Split the bill',
                      text: `Join the bill split for ${receipt?.restaurant}`,
                      url: shareUrl,
                    });
                  }}
                  className={`mb-4 w-full ${ui.primaryButton}`}
                >
                  <Share2 className="w-5 h-5" />
                  Share with Friends
                </button>
              )}

              <Link
                href={`/dashboard/${sessionId}`}
                className={`w-full ${ui.secondaryButton}`}
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
//made with Bob
