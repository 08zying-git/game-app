'use client';

import { Gift } from '@/types';

interface GiftCardProps {
  gift: Gift;
  isRevealed: boolean;
  isCurrentPlayer: boolean;
  canSteal: boolean;
  canReveal?: boolean; // Whether this gift can be revealed (handles exception case)
  onReveal?: () => void;
  onSteal?: () => void;
  ownerName?: string;
  isMyGift?: boolean; // Whether this gift was originally submitted by the current player
}

export default function GiftCard({
  gift,
  isRevealed,
  isCurrentPlayer,
  canSteal,
  canReveal = true,
  onReveal,
  onSteal,
  ownerName,
  isMyGift = false,
}: GiftCardProps) {
  // Check if this is the exception case: last player's only remaining gift
  // Only applies to unrevealed gifts
  const isExceptionCase = !isRevealed && isMyGift && isCurrentPlayer && canReveal;
  // For unrevealed gifts: disable if it's your gift and not exception case
  // For revealed gifts: never disable based on isMyGift (you can steal back your own gift if someone else has it)
  const isDisabled = !isRevealed && isMyGift && isCurrentPlayer && !isExceptionCase;
  
  if (!isRevealed) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 border-2 border-dashed border-gray-300 transition ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed grayscale' 
          : isExceptionCase
          ? 'border-blue-400 hover:border-blue-500 cursor-pointer'
          : 'hover:border-red-400 cursor-pointer'
      }`}>
        <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-pink-50 to-red-50 rounded">
          <span className="text-8xl">🎁</span>
        </div>
        <div className="mt-2 text-center">
          <p className="text-sm font-medium text-gray-600">
            {isDisabled ? 'Your Gift (Cannot Select)' : isExceptionCase ? 'Your Gift (Last One)' : `Gift #${gift.id.slice(0, 8)}`}
          </p>
          {isCurrentPlayer && onReveal && canReveal && (
            <button
              onClick={onReveal}
              className="mt-2 w-full bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
            >
              Reveal
            </button>
          )}
          {isDisabled && (
            <p className="mt-2 text-xs text-gray-500">You cannot select your own gift</p>
          )}
          {isExceptionCase && (
            <p className="mt-2 text-xs text-blue-600">Last remaining gift - you can reveal it</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-2 border-gray-200 transition ${
      isDisabled 
        ? 'opacity-50 grayscale' 
        : isExceptionCase
        ? 'border-blue-300 hover:shadow-lg'
        : 'hover:shadow-lg'
    }`}>
      <div className="aspect-square relative bg-gray-100 rounded mb-2 overflow-hidden">
        {gift.image_url ? (
          <img
            src={gift.image_url}
            alt={gift.title || 'Gift'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/gift-placeholder.png';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-red-50">
            <span className="text-7xl">🎁</span>
          </div>
        )}
        {gift.steal_count > 0 && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
            Stolen {gift.steal_count}x
          </div>
        )}
      </div>
      <div className="text-center">
        <h4 className="font-semibold text-sm mb-1">{gift.title || 'Untitled Gift'}</h4>
        {ownerName && (
          <p className="text-xs text-gray-600 mb-2">Owner: {ownerName}</p>
        )}
        {gift.url && (
          <a
            href={gift.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-red-600 hover:text-red-700 underline"
          >
            View Gift
          </a>
        )}
        {isDisabled && (
          <p className="mt-2 text-xs text-gray-500 italic">Your gift</p>
        )}
        {isCurrentPlayer && canSteal && onSteal && !isDisabled && (
          <button
            onClick={onSteal}
            className="mt-2 w-full bg-red-600 text-white py-1 px-3 rounded text-sm hover:bg-red-700"
          >
            Steal
          </button>
        )}
      </div>
    </div>
  );
}

