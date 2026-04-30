'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Session, Participant } from '@/types';
import { formatCurrency, generateSessionSummary, calculateItemClaims } from '@/lib/calculations';
import { ui } from '@/lib/ui';
import QRCode from 'react-qr-code';
import {
  Loader2,
  Check,
  Lock,
  Unlock,
  RefreshCw,
  Share2,
  Users,
  Receipt,
  AlertTriangle,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function DashboardPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<(Session & { participants: Participant[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/split/${sessionId}`
    : '';

  const fetchSession = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);

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
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSession();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => fetchSession(), 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const toggleLock = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !session.isLocked }),
      });

      if (response.ok) {
        setSession({ ...session, isLocked: !session.isLocked });
      }
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
  };

  const updatePaymentStatus = async (participantId: string, status: 'unpaid' | 'pending' | 'paid' | 'confirmed') => {
    try {
      const response = await fetch(`/api/session/${sessionId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, status }),
      });

      if (response.ok) {
        setSession(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map(p =>
              p.id === participantId ? { ...p, paymentStatus: status } : p
            ),
          };
        });
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className={`${ui.page} flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[#0f766e]" />
          <p className="text-[#5d5d53]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={`${ui.page} flex items-center justify-center p-4`}>
        <div className={`${ui.panel} max-w-md p-8 text-center`}>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[#171717]">Session Not Found</h2>
          <p className="text-[#5d5d53]">{error}</p>
          <Link
            href="/create"
            className="mt-6 inline-block font-semibold text-[#0f766e] hover:underline"
          >
            Create a new split
          </Link>
        </div>
      </div>
    );
  }

  const summary = generateSessionSummary(session, session.participants);
  const itemClaims = calculateItemClaims(session.participants);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-[#0f766e]" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-[#b57905]" />;
      default:
        return <XCircle className="h-5 w-5 text-[#8a8a80]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="rounded-full bg-[#e6f3ee] px-2 py-1 text-xs font-semibold text-[#0f766e]">Confirmed</span>;
      case 'paid':
        return <span className="rounded-full bg-[#e6f3ee] px-2 py-1 text-xs font-semibold text-[#0f766e]">Paid</span>;
      case 'pending':
        return <span className="rounded-full bg-[#fff8df] px-2 py-1 text-xs font-semibold text-[#6f561f]">Pending</span>;
      default:
        return <span className="rounded-full bg-[#efefe7] px-2 py-1 text-xs font-semibold text-[#5d5d53]">Unpaid</span>;
    }
  };

  return (
    <div className={ui.page}>
      {/* Header */}
      <header className={ui.topbar}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-[#171717]">{session.restaurantName}</h1>
            <p className="text-sm text-[#5d5d53]">Payer Dashboard</p>
          </div>
          <button
            onClick={() => fetchSession(true)}
            disabled={isRefreshing}
            className="rounded-lg p-2 text-[#5d5d53] transition-colors hover:bg-[#efefe7] hover:text-[#171717]"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-4 sm:py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <div className={`${ui.panel} p-4`}>
            <p className="mb-1 text-sm text-[#5d5d53]">Total Bill</p>
            <p className="text-2xl font-semibold text-[#171717]">{formatCurrency(session.total)}</p>
          </div>
          <div className={`${ui.panel} p-4`}>
            <p className="mb-1 text-sm text-[#5d5d53]">Collected</p>
            <p className="text-2xl font-semibold text-[#0f766e]">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className={`${ui.panel} p-4`}>
            <p className="mb-1 text-sm text-[#5d5d53]">Remaining</p>
            <p className="text-2xl font-semibold text-[#b45309]">{formatCurrency(summary.totalRemaining)}</p>
          </div>
          <div className={`${ui.panel} p-4`}>
            <p className="mb-1 text-sm text-[#5d5d53]">Participants</p>
            <p className="text-2xl font-semibold text-[#171717]">
              {summary.paidCount}/{summary.participantCount}
            </p>
          </div>
        </div>

        {/* Share Card */}
        <div className={`${ui.panel} p-5 sm:p-6`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#171717]">
                <Share2 className="w-5 h-5" />
                Share Link
              </h2>
              <p className="mt-1 text-sm text-[#5d5d53]">
                Share this with your group to split the bill
              </p>
            </div>
            <button
              onClick={toggleLock}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                session.isLocked
                    ? 'bg-[#fff8df] text-[#6f561f] hover:bg-[#f7edc5]'
                    : 'bg-[#efefe7] text-[#33332e] hover:bg-[#e3e3d8]'
              }`}
            >
              {session.isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Open
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col items-center gap-6 md:flex-row">
            <div className="rounded-lg border border-[#e3e3d8] bg-white p-3 shadow-sm">
              <QRCode value={shareUrl} size={140} />
            </div>

            <div className="flex-1 w-full">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="min-w-0 flex-1 rounded-lg border border-[#d8d8ce] bg-[#fbfbf7] px-3 py-2 font-mono text-sm text-[#171717]"
                />
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#30302b]"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={() => {
                    navigator.share({
                      title: 'SplitSnap',
                      text: `Join the bill split for ${session.restaurantName}`,
                      url: shareUrl,
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#30302b]"
                >
                  <Share2 className="w-4 h-4" />
                  Share with Friends
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className={`${ui.panel} p-5 sm:p-6`}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#171717]">
            <Users className="w-5 h-5" />
            Participants ({session.participants.length})
          </h2>

          {session.participants.length === 0 ? (
            <div className="py-8 text-center text-[#5d5d53]">
              <Users className="mx-auto mb-3 h-12 w-12 text-[#b8b8aa]" />
              <p>No one has joined yet</p>
              <p className="text-sm">Share the link to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {session.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="grid gap-3 rounded-lg border border-[#e3e3d8] bg-[#fbfbf7] p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(participant.paymentStatus)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#171717]">{participant.name}</p>
                    <p className="text-sm text-[#5d5d53]">
                      {participant.selections.length} items selected
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-[#171717]">
                      {formatCurrency(participant.amountOwed)}
                    </p>
                    {getStatusBadge(participant.paymentStatus)}
                  </div>

                  {/* Payment status dropdown */}
                  <select
                    value={participant.paymentStatus}
                    onChange={(e) => updatePaymentStatus(participant.id, e.target.value as 'unpaid' | 'pending' | 'paid' | 'confirmed')}
                    className="rounded-lg border border-[#d8d8ce] bg-white px-2 py-1 text-sm text-[#171717]"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item Claims */}
        <div className={`${ui.panel} p-5 sm:p-6`}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#171717]">
            <Receipt className="w-5 h-5" />
            Item Claims
          </h2>

          <div className="space-y-2">
            {session.items.map((item) => {
              const claim = itemClaims.get(item.id);
              const claimPercent = claim ? Math.round(claim.totalShare * 100) : 0;
              const isFullyClaimed = claimPercent >= 100;
              const isOverclaimed = claimPercent > 100;

              return (
                <div key={item.id} className="flex items-center gap-4 rounded-lg border border-[#e3e3d8] bg-[#fbfbf7] p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#171717]">{item.name}</span>
                      {isOverclaimed && (
                        <AlertTriangle className="h-4 w-4 text-[#b57905]" />
                      )}
                    </div>
                    {claim && claim.claimedBy.length > 0 && (
                      <p className="text-sm text-[#5d5d53]">
                        {claim.claimedBy.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-[#33332e]">{formatCurrency(item.price)}</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-[#d8d8ce]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverclaimed
                              ? 'bg-[#b57905]'
                              : isFullyClaimed
                              ? 'bg-[#0f766e]'
                              : 'bg-[#171717]'
                          }`}
                          style={{ width: `${Math.min(claimPercent, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm text-[#5d5d53]">
                        {claimPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unclaimed warning */}
          {summary.totalUnclaimed > 0.50 && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#f2d37b] bg-[#fff8df] p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#b57905]" />
              <div>
                <p className="font-semibold text-[#5b4213]">
                  {formatCurrency(summary.totalUnclaimed)} unclaimed
                </p>
                <p className="text-sm text-[#6f561f]">
                  Some items haven&apos;t been selected yet. You may want to remind participants or split the remaining amount.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fairness Summary */}
        <div className={`${ui.panel} p-5 sm:p-6`}>
          <h2 className="mb-4 text-lg font-semibold text-[#171717]">Fairness Summary</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-[#fbfbf7] p-3 ring-1 ring-[#e3e3d8]">
              <p className="text-[#5d5d53]">Total bill</p>
              <p className="font-semibold">{formatCurrency(session.total)}</p>
            </div>
            <div className="rounded-lg bg-[#fbfbf7] p-3 ring-1 ring-[#e3e3d8]">
              <p className="text-[#5d5d53]">Claimed</p>
              <p className="font-semibold">{formatCurrency(summary.totalClaimed)}</p>
            </div>
            <div className="rounded-lg bg-[#fbfbf7] p-3 ring-1 ring-[#e3e3d8]">
              <p className="text-[#5d5d53]">Tax ({formatCurrency(session.tax)})</p>
              <p className="font-semibold text-[#0f766e]">Split proportionally</p>
            </div>
            <div className="rounded-lg bg-[#fbfbf7] p-3 ring-1 ring-[#e3e3d8]">
              <p className="text-[#5d5d53]">Tip ({formatCurrency(session.tip)})</p>
              <p className="font-semibold text-[#0f766e]">Split proportionally</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
