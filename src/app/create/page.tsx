'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Receipt, PaymentInfo } from '@/types';
import ReceiptScanner from '@/components/ReceiptScanner';
import BillEditor from '@/components/BillEditor';
import { ArrowLeft, ArrowRight, Loader2, QrCode, Share2 } from 'lucide-react';
import QRCode from 'react-qr-code';

type Step = 'scan' | 'edit' | 'payment' | 'share';

export default function CreatePage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">
            {step === 'scan' && 'Scan Receipt'}
            {step === 'edit' && 'Edit Bill'}
            {step === 'payment' && 'Payment Info'}
            {step === 'share' && 'Share with Friends'}
          </h1>
          <div className="w-16" />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: step === 'scan' ? '25%' : step === 'edit' ? '50%' : step === 'payment' ? '75%' : '100%',
            }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Step 1: Scan */}
        {step === 'scan' && (
          <div>
            <ReceiptScanner onScanComplete={handleScanComplete} />

            {/* Demo mode - skip scan */}
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
                className="text-blue-600 hover:underline text-sm"
              >
                Try with demo receipt
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Edit */}
        {step === 'edit' && receipt && (
          <div>
            <BillEditor receipt={receipt} onUpdate={setReceipt} />

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep('payment')}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Info */}
        {step === 'payment' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your details</h2>

            {/* Payer name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your name *
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Number of people */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of people
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setNumberOfPeople(Math.max(2, numberOfPeople - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-medium hover:border-blue-500 transition-colors"
                >
                  -
                </button>
                <span className="text-2xl font-semibold w-8 text-center">{numberOfPeople}</span>
                <button
                  onClick={() => setNumberOfPeople(numberOfPeople + 1)}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-medium hover:border-blue-500 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Preferred payment method */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred payment method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['twint', 'revolut', 'iban', 'cash'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentInfo({ ...paymentInfo, preferredMethod: method as PaymentInfo['preferredMethod'] })}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      paymentInfo.preferredMethod === method
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium capitalize">{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment details based on method */}
            {paymentInfo.preferredMethod === 'twint' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TWINT phone number
                </label>
                <input
                  type="tel"
                  value={paymentInfo.twintPhone || ''}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, twintPhone: e.target.value })}
                  placeholder="+41 79 123 45 67"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            )}

            {paymentInfo.preferredMethod === 'revolut' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revolut username
                </label>
                <div className="flex items-center">
                  <span className="px-4 py-3 bg-gray-100 border border-r-0 rounded-l-lg text-gray-500">
                    @
                  </span>
                  <input
                    type="text"
                    value={paymentInfo.revolutTag || ''}
                    onChange={(e) => setPaymentInfo({ ...paymentInfo, revolutTag: e.target.value })}
                    placeholder="yourname"
                    className="flex-1 px-4 py-3 border rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {paymentInfo.preferredMethod === 'iban' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={paymentInfo.iban || ''}
                  onChange={(e) => setPaymentInfo({ ...paymentInfo, iban: e.target.value })}
                  placeholder="CH93 0076 2011 6238 5295 7"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                />
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('edit')}
                className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:border-gray-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCreateSession}
                disabled={isCreating || !payerName.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Step 4: Share */}
        {step === 'share' && shareUrl && (
          <div className="text-center">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your split link is ready!
              </h2>
              <p className="text-gray-600 mb-6">
                Share this link with your friends so they can select their items
              </p>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <QRCode value={shareUrl} size={180} />
                </div>
              </div>

              {/* Share URL */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-2">Share link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-2 bg-white border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Native share button */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={() => {
                    navigator.share({
                      title: 'SplitSnap - Split the bill',
                      text: `Join the bill split for ${receipt?.restaurant}`,
                      url: shareUrl,
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-4"
                >
                  <Share2 className="w-5 h-5" />
                  Share with Friends
                </button>
              )}

              <Link
                href={`/dashboard/${sessionId}`}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
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
