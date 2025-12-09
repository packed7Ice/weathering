import { useState } from 'react';
import { Board } from './components/Board/Board';
import { WeatherBanner } from './components/UI/WeatherBanner';
import { PlayerPanel } from './components/UI/PlayerPanel';
import { ActionPanel } from './components/UI/ActionPanel';
import { useGameState } from './hooks/useGameState';
import { useApiClient } from './hooks/useApiClient';

function App() {
  /* 
     Initialize gameId from URL if present.
     This avoids using useEffect for setting initial state which prevents the 'setState in effect' warning.
  */
  const [gameId, setGameId] = useState<string | null>(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('gameId');
  });

  const { gameState, weather, loading, resolveTurn, resolveAction } = useGameState(gameId);
  const api = useApiClient();

  const handleRollDice = async () => {
       const res = await resolveAction('roll_dice') as { message?: string; dice?: number } | null;
       if (res && res.message) {
           console.log(res.message); // Could be a toast
           // You could also show dice animation here based on res.dice
       }
  };

  // Previously we had a useEffect here to set gameId from URL, now handled in useState.


  const handleCreateGame = async () => {
      const res = await api.post<{ gameId: string }>('/game/create_room.php', {});
      if (res) setGameId(res.gameId);
  };

  if (!gameId) {
      return (
          <div className="min-h-screen bg-sky-100 flex items-center justify-center">
              <div className="bg-white p-8 rounded-xl shadow-xl text-center">
                  <h1 className="text-4xl font-extrabold text-[#2a7fa8] mb-6">Weather Catan</h1>
                  
                  {api.error && (
                      <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                          Error: {api.error}
                      </div>
                  )}

                  <button 
                    onClick={handleCreateGame}
                    disabled={api.loading}
                    className="px-8 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold rounded-lg text-xl shadow-lg transform transition hover:scale-105"
                  >
                      {api.loading ? 'Creating...' : 'Start New Game'}
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-50 relative">
            <h1 className="text-xl font-black text-[#2a7fa8] tracking-tight">WEATHER CATAN</h1>
            <div className="text-sm font-mono text-gray-400">Game ID: {gameId}</div>
        </header>

        <main className="max-w-6xl mx-auto p-4 md:p-8">
            <WeatherBanner weather={weather} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Board */}
                <div className="lg:col-span-2">
                    {gameState ? (
                        <Board tiles={gameState.board} weatherBuffs={weather ? weather.buffs : null} />
                    ) : (
                        <div className="h-[600px] bg-gray-200 rounded-xl flex items-center justify-center animate-pulse">
                            Loading Game State...
                        </div>
                    )}
                </div>

                {/* Right: Controls & Players */}
                <div className="space-y-6">
                    {gameState && gameState.players.map((p, i) => (
                         <PlayerPanel key={p.id} gameState={gameState} playerIndex={i} />
                    ))}
                    
                    <ActionPanel 
                        onEndTurn={resolveTurn} 
                        onRollDice={handleRollDice} 
                        loading={loading} 
                    />
                    
                    {/* Debug Info */}
                    <div className="bg-black/80 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-48 shadow-inner">
                        <div className="font-bold text-white mb-1">Turn: {gameState?.turnCount}</div>
                        <div>Active Player: {gameState?.activePlayerIndex}</div>
                        <div>Season: {gameState?.season}</div>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
}

export default App;
