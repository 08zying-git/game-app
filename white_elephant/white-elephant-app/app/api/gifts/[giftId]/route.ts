import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> }
) {
  try {
    const user = await requireAuth();
    const { giftId } = await params;

    const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId) as any;
    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    // Check if user owns this gift
    if (gift.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to view this gift' }, { status: 403 });
    }

    return NextResponse.json({ gift });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching gift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> }
) {
  try {
    const user = await requireAuth();
    const { giftId } = await params;
    const { url, title, description, imageUrl } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Get gift
    const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId) as any;
    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    // Check if user owns this gift
    if (gift.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this gift' }, { status: 403 });
    }

    // Check if game has started
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gift.game_id) as any;
    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot edit gifts after game has started' }, { status: 400 });
    }

    // Update gift
    db.prepare(`
      UPDATE gifts 
      SET url = ?, title = ?, description = ?, image_url = ?
      WHERE id = ?
    `).run(
      url,
      title || null,
      description || null,
      imageUrl || null,
      giftId
    );

    const updatedGift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId);

    return NextResponse.json({ gift: updatedGift });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating gift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> }
) {
  try {
    const user = await requireAuth();
    const { giftId } = await params;

    // Get gift
    const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(giftId) as any;
    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }

    // Check if user owns this gift
    if (gift.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this gift' }, { status: 403 });
    }

    // Check if game has started
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gift.game_id) as any;
    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot delete gifts after game has started' }, { status: 400 });
    }

    // Delete gift
    db.prepare('DELETE FROM gifts WHERE id = ?').run(giftId);

    return NextResponse.json({ message: 'Gift deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting gift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


