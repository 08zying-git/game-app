'use client';

import { Game, Gift } from '@/types';
import Link from 'next/link';

interface GameLobbyProps {
  game: Game;
  participants: Array<{ name: string; email: string; player_id?: string; player_number?: number }>;
  gifts: Gift[];
  isOrganizer: boolean;
  currentUserId?: string;
  onStartGame: () => void;
}

export default function GameLobby({
  game,
  participants,
  gifts,
  isOrganizer,
  currentUserId,
  onStartGame,
}: GameLobbyProps) {
  const myGifts = currentUserId ? gifts.filter(g => g.user_id === currentUserId) : [];
  const otherGifts = currentUserId ? gifts.filter(g => g.user_id !== currentUserId) : gifts;
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">{game.name}</h2>
        {game.description && <p className="text-gray-600 mb-4">{game.description}</p>}
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 px-4 py-2 rounded">
            <p className="text-sm text-gray-600">Game Code</p>
            <p className="text-xl font-bold text-gray-800">{game.game_code}</p>
          </div>
          {game.deadline && (
            <div className="bg-gray-100 px-4 py-2 rounded">
              <p className="text-sm text-gray-600">Deadline</p>
              <p className="text-sm font-semibold text-gray-800">
                {new Date(game.deadline).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Participants ({participants.length})</h3>
        <div className="space-y-2">
          {participants.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-700">{p.name}</span>
              {p.player_number && (
                <span className="text-sm text-gray-500">Player #{p.player_number}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {myGifts.length > 0 && !isOrganizer && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Your Gifts ({myGifts.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {myGifts.map((gift) => (
              <div
                key={gift.id}
                className="border-2 border-red-300 rounded-lg p-4 hover:shadow-md transition bg-red-50"
              >
                <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                  {gift.image_url ? (
                    <img
                      src={gift.image_url}
                      alt={gift.title || 'Gift'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-6xl">🎁</span>
                  )}
                </div>
                <h4 className="font-semibold text-sm mb-1 truncate">
                  {gift.title || 'Untitled Gift'}
                </h4>
                {gift.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {gift.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  {gift.url && (
                    <a
                      href={gift.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-600 hover:text-red-700 underline"
                    >
                      View Link
                    </a>
                  )}
                  <Link
                    href={`/game/${game.id}/edit-gift/${gift.id}`}
                    className="text-xs text-blue-600 hover:text-blue-700 underline ml-auto"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">All Gifts ({gifts.length})</h3>
        {gifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No gifts submitted yet.</p>
            <Link
              href={`/game/${game.id}/submit-gift`}
              className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Add First Gift
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {isOrganizer 
                ? "All gifts are shown as icons. Gift details will be revealed during the game."
                : "Other participants' gifts are hidden until the game starts. You can only see your own gifts above."}
            </p>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mb-4">
              {gifts.map((gift) => {
                const isMyGift = currentUserId && gift.user_id === currentUserId;
                // If organizer, show all gifts as generic icons without names
                // Otherwise, show details for your own gifts, generic icon for others
                if (isOrganizer) {
                  // Organizer sees all gifts as generic icons
                  return (
                    <div
                      key={gift.id}
                      className="aspect-square bg-gradient-to-br from-pink-50 to-red-50 rounded flex items-center justify-center border-2 border-dashed border-red-300"
                      title="Gift"
                    >
                      <span className="text-6xl">🎁</span>
                    </div>
                  );
                } else if (isMyGift) {
                  // Non-organizer sees their own gift with details
                  return (
                    <div
                      key={gift.id}
                      className="border-2 border-red-300 rounded-lg p-2 bg-red-50"
                    >
                      <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                        {gift.image_url ? (
                          <img
                            src={gift.image_url}
                            alt={gift.title || 'Gift'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-6xl">🎁</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-center truncate">
                        {gift.title || 'Your Gift'}
                      </p>
                    </div>
                  );
                } else {
                  // Generic icon for other participants' gifts
                  return (
                    <div
                      key={gift.id}
                      className="aspect-square bg-gradient-to-br from-pink-50 to-red-50 rounded flex items-center justify-center border-2 border-dashed border-red-300"
                      title="Hidden gift"
                    >
                      <span className="text-6xl">🎁</span>
                    </div>
                  );
                }
              })}
            </div>
            <Link
              href={`/game/${game.id}/submit-gift`}
              className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Add Another Gift
            </Link>
          </>
        )}
      </div>

      {isOrganizer && (
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={onStartGame}
            disabled={participants.length < 2 || gifts.length < participants.length}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
          >
            Start Game
          </button>
          {participants.length < 2 && (
            <p className="mt-2 text-sm text-gray-600 text-center">
              Need at least 2 participants to start
            </p>
          )}
          {gifts.length < participants.length && (
            <p className="mt-2 text-sm text-gray-600 text-center">
              Need at least {participants.length} gifts (one per participant)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

