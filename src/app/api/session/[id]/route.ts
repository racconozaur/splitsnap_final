import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { demoStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Use demo storage if Supabase is not configured
    if (!isSupabaseConfigured()) {
      const session = demoStorage.getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    // Fetch session from Supabase
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    // Fetch participants with their selections
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select(`*, selections (*)`)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (participantsError) {
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    // Transform to frontend format
    const transformedSession = {
      id: session.id,
      restaurantName: session.restaurant_name,
      payerName: session.payer_name,
      payerPaymentInfo: session.payer_payment_info,
      items: items?.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isShared: item.is_shared,
        confidence: item.confidence,
      })) || [],
      subtotal: session.subtotal,
      tax: session.tax,
      tip: session.tip,
      serviceFee: session.service_fee,
      total: session.total,
      numberOfPeople: session.number_of_people,
      isLocked: session.is_locked,
      createdAt: session.created_at,
      participants: participants?.map(p => ({
        id: p.id,
        sessionId: p.session_id,
        name: p.name,
        selections: p.selections?.map((s: { item_id: string; share: number }) => ({
          itemId: s.item_id,
          share: s.share,
        })) || [],
        amountOwed: p.amount_owed,
        paymentStatus: p.payment_status,
        createdAt: p.created_at,
      })) || [],
    };

    return NextResponse.json(transformedSession);
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();

    // Use demo storage if Supabase is not configured
    if (!isSupabaseConfigured()) {
      const updates: Record<string, unknown> = {};
      if (body.isLocked !== undefined) updates.isLocked = body.isLocked;
      if (body.tip !== undefined) updates.tip = body.tip;
      if (body.tax !== undefined) updates.tax = body.tax;
      if (body.serviceFee !== undefined) updates.serviceFee = body.serviceFee;

      const success = demoStorage.updateSession(sessionId, updates);
      if (!success) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    const updateData: Record<string, unknown> = {};
    if (body.isLocked !== undefined) updateData.is_locked = body.isLocked;
    if (body.tip !== undefined) updateData.tip = body.tip;
    if (body.tax !== undefined) updateData.tax = body.tax;
    if (body.serviceFee !== undefined) updateData.service_fee = body.serviceFee;

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
