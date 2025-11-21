import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Game } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameCode: string }> }
) {
  try {
    const { gameCode } = await params;

    const game = db.prepare('SELECT * FROM games WHERE game_code = ?').get(gameCode) as Game | undefined;
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Error fetching game by code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

