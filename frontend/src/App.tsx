import { useState } from 'react';
import { Board } from './components/Board/Board';
import { WeatherBanner } from './components/UI/WeatherBanner';
import { PlayerPanel } from './components/UI/PlayerPanel';
import { ActionPanel } from './components/UI/ActionPanel';
import { TradeModal } from './components/UI/TradeModal';
import { DevCardModal } from './components/UI/DevCardModal';
import { DiceDisplay } from './components/UI/DiceDisplay';
import { useGameState } from './hooks/useGameState';
import { useApiClient } from './hooks/useApiClient';

function App() {
    const [winner, setWinner] = useState<{name: string, score: number} | null>(null);
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [showDevCardModal, setShowDevCardModal] = useState(false);

    const [gameId, setGameId] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('gameId');
    });
  
    const [buildMode, setBuildMode] = useState<'road' | 'settlement' | 'city' | null>(null);
  
    // Hooks MUST be called unconditionally
    const { gameState, weather, loading, resolveTurn, resolveAction } = useGameState(gameId);
    const api = useApiClient();

    const checkVictory = (res: { game_over?: boolean, winner?: { name: string, score: number } } | null | undefined) => {
        if (res && res.game_over && res.winner) {
            setWinner(res.winner);
        }
    };

    const handleTrade = async (offer: string, want: string) => {
        const res = await resolveAction('trade', { offer, want });
        const response = res as { message?: string, error?: string } | null;
        
        if (response?.message) {
            console.log(response.message);
        } else if (response?.error) {
            alert("Trade failed: " + response.error);
        }
    };

    const handleBuyDevCard = async () => {
        const res = await resolveAction('buy_dev_card');
        const response = res as { message?: string, error?: string, card?: string } | null;

        if (response?.error) {
            alert("Failed to buy card: " + response.error);
        } else if (response?.message) {
            alert("Bought Card: " + (response.card || 'Secret Card')); 
        }
    };

    const handlePlayDevCard = async (cardType: string, payload?: Record<string, unknown>) => {
        const res = await resolveAction('play_dev_card', { cardType, ...payload });
        const response = res as { message?: string, error?: string } | null;

        if (response?.error) {
            alert("Failed to play card: " + response.error);
        } else if (response?.message) {
            alert(response.message);
        }
    };

    const [lastDice, setLastDice] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);

    const handleRollDice = async () => {
       setIsRolling(true);
       setLastDice(null); // Reset for animation

       // Fake delay for animation
       await new Promise(resolve => setTimeout(resolve, 1000));

       const res = await resolveAction('roll_dice') as { message?: string; dice?: number; game_over?: boolean; winner?: { name: string; score: number } } | null;
       
       setIsRolling(false);
       
       if (res?.dice) {
           setLastDice(res.dice);
       }
       
       checkVictory(res);
       if (res && res.message) {
           console.log(res.message); 
       }
    };

  const handleBuild = async (type: 'road' | 'settlement' | 'city', locationId: string) => {
      if (!buildMode) return;
      const res = await resolveAction('build', { type, locationId });
      checkVictory(res);

      const response = res as { error?: string } | null;
      if (response && !response.error) {
          setBuildMode(null); 
          console.log("Built!", res);
      } else {
          console.error("Build failed", res);
          // alert("Build failed: " + (res as { error?: string })?.error);
      }
  };

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
        {/* Victory Modal */}
        {winner && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border-4 border-yellow-400 transform scale-100">
                    <div className="text-6xl mb-4">🏆</div>
                    <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                        VICTORY!
                    </h2>
                    <p className="text-xl text-gray-600 mb-6">
                        <span className="font-bold text-gray-800">{winner.name}</span> has won the game!
                    </p>
                    <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                        <span className="text-sm text-gray-500 uppercase tracking-wide font-bold">Total Score</span>
                        <div className="text-5xl font-black text-yellow-500">{winner.score} VP</div>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition transform hover:scale-105"
                    >
                        Return to Lobby
                    </button>
                </div>
            </div>
        )}

        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-50 relative">
            <h1 className="text-xl font-black text-[#2a7fa8] tracking-tight">WEATHER CATAN</h1>
            <div className="text-sm font-mono text-gray-400">Game ID: {gameId}</div>
        </header>

        <main className="max-w-6xl mx-auto p-4 md:p-8">
            <WeatherBanner weather={weather} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Board */}
                <div className="lg:col-span-2 relative">
                    <DiceDisplay value={lastDice} rolling={isRolling} />
                    {gameState ? (
                        <Board 
                            tiles={gameState.board} 
                            weatherBuffs={weather ? weather.buffs : null} 
                            buildMode={buildMode}
                            onBuild={handleBuild}
                            constructions={gameState.constructions}
                        />
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
                        onSetBuildMode={setBuildMode}
                        currentBuildMode={buildMode}
                        loading={loading}
                        gameState={gameState}
                        onTradeClick={() => setShowTradeModal(true)}
                        onBuyDevCard={handleBuyDevCard}
                        onOpenDevCards={() => setShowDevCardModal(true)}
                    />
                    
                    {/* Debug Info */}
                    <div className="bg-black/80 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-48 shadow-inner">
                        <div className="font-bold text-white mb-1">Turn: {gameState?.turnCount}</div>
                        <div>Phase: {gameState?.turnPhase}</div>
                        <div>Winner: {gameState?.activePlayerIndex ?? '?'}</div>
                    </div>
                </div>
            </div>

            {/* Trade Modal */}
            {gameState && (
                <TradeModal 
                    isOpen={showTradeModal}
                    onClose={() => setShowTradeModal(false)}
                    gameState={gameState}
                    activePlayerId={gameState.players[gameState.activePlayerIndex]?.id}
                    onTrade={handleTrade}
                />
            )}

            {/* Dev Card Modal */}
            {gameState && (
                <DevCardModal 
                    isOpen={showDevCardModal}
                    onClose={() => setShowDevCardModal(false)}
                    gameState={gameState}
                    activePlayerId={gameState.players[gameState.activePlayerIndex]?.id}
                    onPlayCard={handlePlayDevCard}
                />
            )}
        </main>

    </div>
  );
}

export default App;
