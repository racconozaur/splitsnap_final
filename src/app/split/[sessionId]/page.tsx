'use client';

import { useState, useEffect, use } from 'react';
import { Session, Participant, ItemSelection, CalculatedAmount } from '@/types';
import ItemSelector from '@/components/ItemSelector';
import PaymentQR from '@/components/PaymentQR';
import { formatCurrency } from '@/lib/calculations';
import { Loader2, Check, Lock, ArrowRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SplitPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<(Session & { participants: Participant[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant state
  const [participantName, setParticipantName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [selections, setSelections] = useState<ItemSelection[]>([]);
  const [calculatedAmount, setCalculatedAmount] = useState<CalculatedAmount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (!response.ok) {
          throw new Error('Session not found');
        }
        const data = await response.json();
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // Check for existing participant in localStorage
    const storedParticipantId = localStorage.getItem(`splitsnap_participant_${sessionId}`);
    const storedName = localStorage.getItem(`splitsnap_name_${sessionId}`);
    if (storedParticipantId && storedName) {
      setParticipantId(storedParticipantId);
      setParticipantName(storedName);
      setHasJoined(true);
    }
  }, [sessionId]);

  // Load existing selections when participant rejoins
  useEffect(() => {
    if (hasJoined && session && participantId) {
      const existingParticipant = session.participants.find(p => p.id === participantId);
      if (existingParticipant) {
        setSelections(existingParticipant.selections);
        if (existingParticipant.amountOwed > 0) {
          setHasConfirmed(true);
          // Reconstruct calculated amount
          setCalculatedAmount({
            itemsTotal: existingParticipant.amountOwed, // Approximation
            taxShare: 0,
            tipShare: 0,
            serviceFeeShare: 0,
            total: existingParticipant.amountOwed,
          });
        }
      }
    }
  }, [hasJoined, session, participantId]);

  const handleJoin = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/session/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: participantName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join');
      }

      const data = await response.json();
      setParticipantId(data.participantId);
      setHasJoined(true);

      // Store in localStorage
      localStorage.setItem(`splitsnap_participant_${sessionId}`, data.participantId);
      localStorage.setItem(`splitsnap_name_${sessionId}`, participantName.trim());

      // Refresh session to get updated participants
      const sessionResponse = await fetch(`/api/session/${sessionId}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSelections = async () => {
    if (!participantId || selections.length === 0) {
      setError('Please select at least one item');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/session/${sessionId}/select-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          selections,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save selections');
      }

      const data = await response.json();
      setCalculatedAmount(data.calculatedAmount);
      setHasConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selections');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // If session is locked and user hasn't joined, show locked message
  if (session.isLocked && !hasJoined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Locked</h2>
          <p className="text-gray-600">This bill split session has been locked by the payer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900 text-center">
            {session.restaurantName}
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Paid by {session.payerName} • {formatCurrency(session.total)}
          </p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {/* Join form */}
        {!hasJoined && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Join the split</h2>
            <p className="text-gray-600 mb-4">Enter your name to select your items</p>

            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={isSubmitting || !participantName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Item selection */}
        {hasJoined && !hasConfirmed && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Hi {participantName}! What did you have?
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Select the items you ordered. For shared items, choose your portion.
              </p>

              <ItemSelector
                items={session.items}
                participants={session.participants}
                currentParticipantId={participantId || ''}
                selections={selections}
                onSelectionChange={setSelections}
                isLocked={session.isLocked}
              />
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your selection</h3>

              {selections.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items selected yet</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selections.map(sel => {
                    const item = session.items.find(i => i.id === sel.itemId);
                    if (!item) return null;
                    return (
                      <div key={sel.itemId} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.name}
                          {sel.share < 1 && (
                            <span className="text-gray-400 ml-1">
                              ({Math.round(sel.share * 100)}%)
                            </span>
                          )}
                        </span>
                        <span className="font-medium">{formatCurrency(item.price * sel.share)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirmSelections}
                disabled={isSubmitting || selections.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirm Selection
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Payment view */}
        {hasConfirmed && calculatedAmount && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Selection confirmed!
                </h2>
              </div>

              <div className="border-t border-b py-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Your items</span>
                  <span>{formatCurrency(calculatedAmount.itemsTotal)}</span>
                </div>
                {calculatedAmount.taxShare > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+ Tax share</span>
                    <span>{formatCurrency(calculatedAmount.taxShare)}</span>
                  </div>
                )}
                {calculatedAmount.tipShare > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+ Tip share</span>
                    <span>{formatCurrency(calculatedAmount.tipShare)}</span>
                  </div>
                )}
                {calculatedAmount.serviceFeeShare > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">+ Service fee share</span>
                    <span>{formatCurrency(calculatedAmount.serviceFeeShare)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">You owe</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculatedAmount.total)}
                </span>
              </div>
            </div>

            <PaymentQR
              paymentInfo={session.payerPaymentInfo}
              amount={calculatedAmount.total}
              payerName={session.payerName}
              participantName={participantName}
              restaurantName={session.restaurantName}
            />
          </div>
        )}
      </main>
    </div>
  );
}
