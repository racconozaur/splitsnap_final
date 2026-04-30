'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Session, Participant } from '@/types';
import { formatCurrency, generateSessionSummary, calculateItemClaims } from '@/lib/calculations';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600">{error}</p>
          <Link
            href="/create"
            className="mt-6 inline-block text-blue-600 hover:underline"
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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Confirmed</span>;
      case 'paid':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Paid</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Unpaid</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{session.restaurantName}</h1>
            <p className="text-sm text-gray-500">Payer Dashboard</p>
          </div>
          <button
            onClick={() => fetchSession(true)}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500 mb-1">Total Bill</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(session.total)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500 mb-1">Collected</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500 mb-1">Remaining</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalRemaining)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500 mb-1">Participants</p>
            <p className="text-2xl font-bold text-blue-600">
              {summary.paidCount}/{summary.participantCount}
            </p>
          </div>
        </div>

        {/* Share Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Link
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Share this with your group to split the bill
              </p>
            </div>
            <button
              onClick={toggleLock}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                session.isLocked
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-white p-3 rounded-lg border shadow-sm">
              <QRCode value={shareUrl} size={140} />
            </div>

            <div className="flex-1 w-full">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg text-sm font-mono"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share with Friends
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            Participants ({session.participants.length})
          </h2>

          {session.participants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No one has joined yet</p>
              <p className="text-sm">Share the link to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {session.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(participant.paymentStatus)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{participant.name}</p>
                    <p className="text-sm text-gray-500">
                      {participant.selections.length} items selected
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(participant.amountOwed)}
                    </p>
                    {getStatusBadge(participant.paymentStatus)}
                  </div>

                  {/* Payment status dropdown */}
                  <select
                    value={participant.paymentStatus}
                    onChange={(e) => updatePaymentStatus(participant.id, e.target.value as 'unpaid' | 'pending' | 'paid' | 'confirmed')}
                    className="text-sm border rounded-lg px-2 py-1 bg-white"
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
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
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {isOverclaimed && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    {claim && claim.claimedBy.length > 0 && (
                      <p className="text-sm text-gray-500">
                        {claim.claimedBy.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-medium text-gray-700">{formatCurrency(item.price)}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverclaimed
                              ? 'bg-yellow-500'
                              : isFullyClaimed
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(claimPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">
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
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  {formatCurrency(summary.totalUnclaimed)} unclaimed
                </p>
                <p className="text-sm text-yellow-700">
                  Some items haven&apos;t been selected yet. You may want to remind participants or split the remaining amount.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fairness Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fairness Summary</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Total bill</p>
              <p className="font-semibold">{formatCurrency(session.total)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Claimed</p>
              <p className="font-semibold">{formatCurrency(summary.totalClaimed)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Tax ({formatCurrency(session.tax)})</p>
              <p className="font-semibold text-green-600">Split proportionally</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Tip ({formatCurrency(session.tip)})</p>
              <p className="font-semibold text-green-600">Split proportionally</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
