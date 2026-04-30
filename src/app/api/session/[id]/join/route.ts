import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { demoStorage } from '@/lib/storage';
import { nanoid } from 'nanoid';

interface JoinSessionBody {
  name: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body: JoinSessionBody = await request.json();

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const session = demoStorage.getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      if (session.isLocked) {
        return NextResponse.json(
          { error: 'Session is locked. No new participants allowed.' },
          { status: 403 }
        );
      }

      const participantId = nanoid(10);
      const participant = demoStorage.addParticipant(sessionId, participantId, body.name.trim());

      if (!participant) {
        return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        participantId: participant.id,
        isExisting: participant.id !== participantId,
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, is_locked')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.is_locked) {
      return NextResponse.json(
        { error: 'Session is locked. No new participants allowed.' },
        { status: 403 }
      );
    }

    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', sessionId)
      .ilike('name', body.name.trim())
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        participantId: existing.id,
        isExisting: true,
      });
    }

    const participantId = nanoid(10);

    const { error: participantError } = await supabase
      .from('participants')
      .insert({
        id: participantId,
        session_id: sessionId,
        name: body.name.trim(),
        amount_owed: 0,
        payment_status: 'unpaid',
      });

    if (participantError) {
      console.error('Participant creation error:', participantError);
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      participantId,
      isExisting: false,
    });
  } catch (error) {
    console.error('Join session error:', error);
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
  }
}
//made with Bob
