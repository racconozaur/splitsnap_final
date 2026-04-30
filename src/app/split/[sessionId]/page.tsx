'use client';

import { useState, useEffect, use } from 'react';
import { Session, Participant, ItemSelection, CalculatedAmount } from '@/types';
import ItemSelector from '@/components/ItemSelector';
import PaymentQR from '@/components/PaymentQR';
import { formatCurrency } from '@/lib/calculations';
import { ui } from '@/lib/ui';
import { Loader2, Check, Lock, ArrowRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SplitPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<(Session & { participants: Participant[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [participantName, setParticipantName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [selections, setSelections] = useState<ItemSelection[]>([]);
  const [calculatedAmount, setCalculatedAmount] = useState<CalculatedAmount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

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

    const storedParticipantId = localStorage.getItem(`splitsnap_participant_${sessionId}`);
    const storedName = localStorage.getItem(`splitsnap_name_${sessionId}`);
    if (storedParticipantId && storedName) {
      setParticipantId(storedParticipantId);
      setParticipantName(storedName);
      setHasJoined(true);
    }
  }, [sessionId]);

  useEffect(() => {
    if (hasJoined && session && participantId) {
      const existingParticipant = session.participants.find(p => p.id === participantId);
      if (existingParticipant) {
        setSelections(existingParticipant.selections);
        if (existingParticipant.amountOwed > 0) {
          setHasConfirmed(true);
          setCalculatedAmount({
            itemsTotal: existingParticipant.amountOwed,
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

      localStorage.setItem(`splitsnap_participant_${sessionId}`, data.participantId);
      localStorage.setItem(`splitsnap_name_${sessionId}`, participantName.trim());

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
      <div className={`${ui.page} flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[#0f766e]" />
          <p className="text-[#5d5d53]">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className={`${ui.page} flex items-center justify-center p-4`}>
        <div className={`${ui.panel} max-w-md p-8 text-center`}>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[#171717]">Session Not Found</h2>
          <p className="text-[#5d5d53]">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (session.isLocked && !hasJoined) {
    return (
      <div className={`${ui.page} flex items-center justify-center p-4`}>
        <div className={`${ui.panel} max-w-md p-8 text-center`}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff8df]">
            <Lock className="h-8 w-8 text-[#b57905]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[#171717]">Session Locked</h2>
          <p className="text-[#5d5d53]">This bill split session has been locked by the payer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <header className={ui.topbar}>
        <div className="mx-auto max-w-xl px-4 py-4">
          <h1 className="text-center text-lg font-semibold text-[#171717]">
            {session.restaurantName}
          </h1>
          <p className="text-center text-sm text-[#5d5d53]">
            Paid by {session.payerName} • {formatCurrency(session.total)}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-3 py-5 sm:px-4 sm:py-6">
        {!hasJoined && (
          <div className={`${ui.panel} mb-6 p-5 sm:p-6`}>
            <h2 className="mb-3 text-xl font-semibold text-[#171717]">Join the split</h2>
            <p className="mb-4 text-[#5d5d53]">Enter your name to select your items</p>

            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Your name"
              className={`${ui.input} mb-4`}
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
              className={`w-full ${ui.primaryButton}`}
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

        {hasJoined && !hasConfirmed && (
          <>
            <div className={`${ui.panel} mb-6 p-5 sm:p-6`}>
              <h2 className="mb-2 text-lg font-semibold text-[#171717]">
                Hi {participantName}! What did you have?
              </h2>
              <p className="mb-4 text-sm text-[#5d5d53]">
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

            <div className={`${ui.panel} mb-6 p-5 sm:p-6`}>
              <h3 className="mb-4 text-lg font-semibold text-[#171717]">Your selection</h3>

              {selections.length === 0 ? (
                <p className="py-4 text-center text-[#5d5d53]">No items selected yet</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selections.map(sel => {
                    const item = session.items.find(i => i.id === sel.itemId);
                    if (!item) return null;
                    return (
                      <div key={sel.itemId} className="flex justify-between gap-3 text-sm">
                        <span className="min-w-0 text-[#33332e]">
                          {item.name}
                          {sel.share < 1 && (
                            <span className="ml-1 text-[#77776c]">
                              ({Math.round(sel.share * 100)}%)
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-[#171717]">{formatCurrency(item.price * sel.share)}</span>
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
                className={`w-full ${ui.primaryButton}`}
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

        {hasConfirmed && calculatedAmount && (
          <div>
            <div className={`${ui.panel} mb-6 p-5 sm:p-6`}>
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f3ee]">
                  <Check className="h-8 w-8 text-[#0f766e]" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-[#171717]">
                  Selection confirmed!
                </h2>
              </div>

              <div className="mb-4 space-y-2 border-y border-[#e3e3d8] py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5d5d53]">Your items</span>
                  <span>{formatCurrency(calculatedAmount.itemsTotal)}</span>
                </div>
                {calculatedAmount.taxShare > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5d5d53]">+ Tax share</span>
                    <span>{formatCurrency(calculatedAmount.taxShare)}</span>
                  </div>
                )}
                {calculatedAmount.tipShare > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5d5d53]">+ Tip share</span>
                    <span>{formatCurrency(calculatedAmount.tipShare)}</span>
                  </div>
                )}
                {calculatedAmount.serviceFeeShare > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5d5d53]">+ Service fee share</span>
                    <span>{formatCurrency(calculatedAmount.serviceFeeShare)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">You owe</span>
                <span className="text-2xl font-semibold text-[#0f766e]">
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
//made with Bob
