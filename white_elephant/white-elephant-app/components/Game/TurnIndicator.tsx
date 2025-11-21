'use client';

interface TurnIndicatorProps {
  currentTurn: number;
  currentPlayerNumber?: number;
  participants: Array<{ player_number?: number; name: string; user_id: string }>;
}

export default function TurnIndicator({
  currentTurn,
  currentPlayerNumber,
  participants,
}: TurnIndicatorProps) {
  const currentPlayer = participants.find(p => p.player_number === currentTurn);
  const isMyTurn = currentPlayerNumber === currentTurn;

  return (
    <div className={`bg-white rounded-lg shadow p-4 mb-6 ${isMyTurn ? 'border-2 border-red-500' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Current Turn</p>
          <p className="text-xl font-bold text-gray-800">
            Player #{currentTurn} {currentPlayer?.name && `- ${currentPlayer.name}`}
          </p>
        </div>
        {isMyTurn && (
          <div className="bg-red-600 text-white px-4 py-2 rounded font-semibold">
            Your Turn!
          </div>
        )}
      </div>
    </div>
  );
}


