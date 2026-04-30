import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { demoStorage } from '@/lib/storage';
import { ItemSelection, Session } from '@/types';
import { calculateParticipantAmount } from '@/lib/calculations';
import { nanoid } from 'nanoid';

interface SelectItemsBody {
  participantId: string;
  selections: ItemSelection[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body: SelectItemsBody = await request.json();

    // Use demo storage if Supabase is not configured
    if (!isSupabaseConfigured()) {
      const session = demoStorage.getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      if (session.isLocked) {
        return NextResponse.json(
          { error: 'Session is locked. Selections cannot be modified.' },
          { status: 403 }
        );
      }

      const participant = demoStorage.getParticipant(sessionId, body.participantId);
      if (!participant) {
        return NextResponse.json(
          { error: 'Participant not found in this session' },
          { status: 404 }
        );
      }

      const calculatedAmount = calculateParticipantAmount(body.selections, session);
      demoStorage.updateParticipantSelections(
        sessionId,
        body.participantId,
        body.selections,
        calculatedAmount.total
      );

      return NextResponse.json({ success: true, calculatedAmount });
    }

    // Verify session exists and is not locked
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.is_locked) {
      return NextResponse.json(
        { error: 'Session is locked. Selections cannot be modified.' },
        { status: 403 }
      );
    }

    // Verify participant belongs to this session
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('id', body.participantId)
      .eq('session_id', sessionId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Participant not found in this session' },
        { status: 404 }
      );
    }

    // Get items for the session
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('session_id', sessionId);

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    // Delete existing selections for this participant
    await supabase
      .from('selections')
      .delete()
      .eq('participant_id', body.participantId);

    // Calculate amounts for each selection
    const sessionData: Session = {
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
    };

    const calculatedAmount = calculateParticipantAmount(body.selections, sessionData);

    // Insert new selections
    if (body.selections.length > 0) {
      const selectionsToInsert = body.selections.map(sel => {
        const item = items?.find(i => i.id === sel.itemId);
        const itemAmount = item ? item.price * sel.share : 0;
        return {
          id: nanoid(10),
          participant_id: body.participantId,
          item_id: sel.itemId,
          share: sel.share,
          amount: itemAmount,
        };
      });

      const { error: insertError } = await supabase
        .from('selections')
        .insert(selectionsToInsert);

      if (insertError) {
        console.error('Selection insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save selections' }, { status: 500 });
      }
    }

    // Update participant's amount owed
    const { error: updateError } = await supabase
      .from('participants')
      .update({ amount_owed: calculatedAmount.total })
      .eq('id', body.participantId);

    if (updateError) {
      console.error('Participant update error:', updateError);
      return NextResponse.json({ error: 'Failed to update amount owed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, calculatedAmount });
  } catch (error) {
    console.error('Select items error:', error);
    return NextResponse.json({ error: 'Failed to select items' }, { status: 500 });
  }
}
