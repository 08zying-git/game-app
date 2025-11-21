'use client';

import { Gift } from '@/types';
import GiftCard from './GiftCard';

interface GiftGridProps {
  gifts: Gift[];
  revealedGifts: Gift[];
  unrevealedGifts: Gift[];
  isCurrentPlayer: boolean;
  currentPlayerId: string;
  canStealGift: (gift: Gift) => boolean;
  canRevealGift?: (gift: Gift) => boolean;
  onReveal: (giftId: string) => void;
  onSteal: (giftId: string) => void;
  ownerNames: Record<string, string>;
  currentUserId?: string; // Original submitter ID
}

export default function GiftGrid({
  gifts,
  revealedGifts,
  unrevealedGifts,
  isCurrentPlayer,
  currentPlayerId,
  canStealGift,
  canRevealGift,
  onReveal,
  onSteal,
  ownerNames,
  currentUserId,
}: GiftGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {gifts.map((gift) => {
        const isMyGift = Boolean(currentUserId && gift.user_id === currentUserId);
        const canReveal = canRevealGift ? canRevealGift(gift) : true;
        return (
          <GiftCard
            key={gift.id}
            gift={gift}
            isRevealed={gift.is_revealed === 1 || gift.is_revealed === true}
            isCurrentPlayer={isCurrentPlayer}
            canSteal={canStealGift(gift)}
            canReveal={canReveal}
            onReveal={(gift.is_revealed === 0 || gift.is_revealed === false) && canReveal ? () => onReveal(gift.id) : undefined}
            onSteal={(gift.is_revealed === 1 || gift.is_revealed === true) ? () => onSteal(gift.id) : undefined}
            ownerName={gift.current_owner_id ? ownerNames[gift.current_owner_id] : undefined}
            isMyGift={isMyGift}
          />
        );
      })}
    </div>
  );
}

