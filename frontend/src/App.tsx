import { useState, useEffect } from 'react';
import { Board } from './components/Board/Board';
// ... imports
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
    const { gameState, weather, loading, resolveTurn, resolveAction, updateGameState } = useGameState(gameId);
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
          console.error("Build failed. API returned:", res);
          // If res is null, it typically means a 400 Bad Request error from the server (e.g. invalid move) was caught by useApiClient
          const msg = response?.error || "Server rejected action (Check rules/logs)";
          alert(`Build failed: ${msg}`);
      }
  };

  const handleCreateGame = async () => {
      const res = await api.post<{ gameId: string }>('/game/create_room.php', {});
      if (res) setGameId(res.gameId);
  };



  /* AI Turn Logic */
  const [aiProcessing, setAiProcessing] = useState(false);

  useEffect(() => {
      if (!gameState || !gameId) return;

      // If Active Player is CPU (Index > 0)
      if (gameState.activePlayerIndex !== 0 && !winner && !aiProcessing) { 
          const runAi = async () => {
              setAiProcessing(true);
              
              // CPUのターン中はループで継続
              let currentState = gameState;
              const maxIterations = 20; // 無限ループ防止
              let iterations = 0;
              
              while (currentState.activePlayerIndex !== 0 && iterations < maxIterations && !winner) {
                  iterations++;
                  // Small delay for UX
                  await new Promise(r => setTimeout(r, 800));
                  
                  try {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const res = await api.post<{ gameState: any, aiAction: any, status: string }>('/game/ai_turn.php', { gameId });
                      if (res && res.gameState) {
                          currentState = res.gameState;
                          updateGameState(res.gameState);
                          console.log("AI Action:", res.aiAction);
                      } else {
                          break; // エラーまたは空のレスポンスの場合は終了
                      }
                  } catch (e) {
                      console.error("AI Error:", e);
                      break;
                  }
              }
              
              setAiProcessing(false);
          };
          runAi();
      }
  }, [gameState, gameId, aiProcessing, api, winner, updateGameState]); 

  // --- Start Screen ---
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

  // --- Main Game Screen ---
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800 relative">
        {/* Victory Modal */}
        {winner && (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white p-12 rounded-3xl shadow-2xl text-center transform scale-125">
                    <h2 className="text-6xl font-black text-yellow-500 mb-4 drop-shadow-md">VICTORY!</h2>
                    <p className="text-3xl font-bold text-gray-800 mb-8">{winner.name} Wins!</p>
                    <div className="text-6xl mb-8">🏆</div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full text-xl shadow-lg transition-all hover:scale-110 active:scale-95"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        )}
        
        {/* CPU Wait Overlay */}
        {gameState && gameState.activePlayerIndex !== 0 && !winner && (
            <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center pointer-events-none">
                 <div className="bg-white/90 p-4 rounded-full shadow-xl animate-pulse font-bold text-blue-600 text-lg flex items-center gap-3">
                     <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
                     CPU {gameState.activePlayerIndex + 1} Thinking...
                 </div>
            </div>
        )}

        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-50 sticky top-0">
            <h1 className="text-xl md:text-2xl font-black text-[#2a7fa8] tracking-tight">WEATHER CATAN</h1>
            <div className="flex gap-2 md:gap-4 items-center">
                <div className="text-xs md:text-sm font-bold bg-slate-200 px-3 py-1 rounded-full text-slate-600">
                    Turn: {gameState ? gameState.turnCount : 0} | Phase: <span className="uppercase text-blue-600">{gameState ? gameState.turnPhase.replace('_', ' ') : '-'}</span>
                </div>
            </div>
        </header>

        <main className="max-w-6xl mx-auto p-2 md:p-8">
            <WeatherBanner weather={weather} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Left: Board */}
                <div className="lg:col-span-2 relative">
                    {/* Dice Display */}
                    <DiceDisplay value={lastDice} rolling={isRolling} />
                    
                    {gameState ? (
                        <div className="bg-white/50 rounded-2xl md:rounded-3xl shadow-inner border border-white/50 relative overflow-hidden backdrop-blur-sm p-2 md:p-4 h-[400px] md:h-[500px] flex items-center justify-center">
                            <div className="w-full h-full flex items-center justify-center">
                                <Board 
                                    tiles={gameState.board} 
                                    weatherBuffs={weather ? weather.buffs : null} 
                                    buildMode={buildMode}
                                    onBuild={handleBuild}
                                    constructions={gameState.constructions}
                                    players={gameState.players}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] md:h-[500px] bg-gray-200 rounded-xl flex items-center justify-center animate-pulse">
                            Loading Game State...
                        </div>
                    )}
                </div>

                {/* Right: Controls & Players */}
                <div className="space-y-4 md:space-y-6">
                    <div className="overflow-y-auto max-h-[300px] pr-2 space-y-3">
                        {gameState && gameState.players.map((p, i) => (
                             <PlayerPanel key={p.id} gameState={gameState} playerIndex={i} />
                        ))}
                    </div>
                    
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
                    activePlayerId={gameState.players[0].id} // Always Me (Player 0)
                    onTrade={handleTrade}
                />
            )}

            {/* Dev Card Modal */}
            {gameState && (
                <DevCardModal 
                    isOpen={showDevCardModal}
                    onClose={() => setShowDevCardModal(false)}
                    gameState={gameState}
                    activePlayerId={gameState.players[0].id} // Always Me (Player 0)
                    onPlayCard={handlePlayDevCard}
                />
            )}
        </main>
    </div>
  );
}

export default App;
