import type { GameState } from "../../types/game";

interface Props {
    onEndTurn: () => void;
    onRollDice: () => void;
    onSetBuildMode: (mode: 'road' | 'settlement' | 'city' | null) => void;
    currentBuildMode: 'road' | 'settlement' | 'city' | null;
    loading: boolean;
    gameState?: GameState | null;
    onTradeClick: () => void;
    onBuyDevCard: () => void;
    onOpenDevCards: () => void;
}

export const ActionPanel = ({ onEndTurn, onRollDice, onSetBuildMode, currentBuildMode, loading, onTradeClick, onBuyDevCard, onOpenDevCards, gameState }: Props) => {
    const isRollPhase = gameState?.turnPhase === 'roll';
    const isMainPhase = gameState?.turnPhase === 'main';
    const isSetupPhase = gameState?.turnPhase?.startsWith('setup') ?? false;
    
    // Logic for Setup Phase Guidance
    const activePlayerIndex = gameState?.activePlayerIndex ?? -1;
    const activePlayerId = gameState?.players[activePlayerIndex]?.id;
    const myConstructions = gameState?.constructions.filter(c => c.player_id === activePlayerId) || [];
    const mySettlements = myConstructions.filter(c => c.type === 'settlement').length;
    const myRoads = myConstructions.filter(c => c.type === 'road').length;

    let canBuildSettlement = false;
    let canBuildRoad = false;
    let setupInstruction = "準備フェーズ";

    if (isMainPhase) {
        canBuildSettlement = true; // Still need resources, but Button enabled to enter mode
        canBuildRoad = true;
    } else if (isSetupPhase) {
        if (gameState?.turnPhase === 'setup_1') {
            if (mySettlements === 0) {
                canBuildSettlement = true;
                setupInstruction = "開拓地を1つ建設してください";
            } else if (myRoads === 0) {
                canBuildRoad = true;
                setupInstruction = "開拓地に接続する街道を1つ建設してください";
            }
        } else if (gameState?.turnPhase === 'setup_2') {
             if (mySettlements === 1) {
                canBuildSettlement = true;
                setupInstruction = "2つ目の開拓地を建設してください";
            } else if (myRoads === 1) {
                canBuildRoad = true;
                setupInstruction = "2つ目の街道を建設してください";
            }
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span>Actions</span>
                <span className="text-xs font-normal bg-gray-100 flex-1 text-center py-1 rounded">
                    Phase: <span className="font-bold uppercase text-blue-600">{gameState?.turnPhase || 'Unknown'}</span>
                </span>
            </h2>

            {isSetupPhase && (
                 <div className="mb-4 text-sm font-bold text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                     {setupInstruction}
                 </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 mb-4">
                 <button 
                  onClick={onRollDice}
                  disabled={loading || !isRollPhase}
                  className={`p-3 font-bold rounded-lg transition shadow-md flex flex-col items-center justify-center ${
                      loading || !isRollPhase
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                 >
                     <span className="text-2xl">🎲</span>
                     <span className="text-sm">Roll Dice</span>
                 </button>
                 <button 
                    onClick={() => onSetBuildMode(currentBuildMode === 'road' ? null : 'road')}
                    disabled={!canBuildRoad}
                    className={`p-3 font-bold rounded-lg transition border flex flex-col items-center justify-center ${
                         !canBuildRoad
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : currentBuildMode === 'road'
                            ? 'bg-orange-200 border-orange-400 text-orange-900 ring-2 ring-orange-300'
                            : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300'
                    }`}
                 >
                     <span className="text-sm">Build Road</span>
                 </button>
                 <button 
                    onClick={() => onSetBuildMode(currentBuildMode === 'settlement' ? null : 'settlement')}
                    disabled={!canBuildSettlement}
                    className={`p-3 font-bold rounded-lg transition border flex flex-col items-center justify-center ${
                         !canBuildSettlement
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : currentBuildMode === 'settlement'
                            ? 'bg-green-200 border-green-400 text-green-900 ring-2 ring-green-300'
                            : 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300'
                    }`}
                 >
                     <span className="text-sm">Build Settlement</span>
                 </button>
                 <button 
                    onClick={() => onSetBuildMode(currentBuildMode === 'city' ? null : 'city')}
                    disabled={!isMainPhase}
                    className={`p-3 font-bold rounded-lg transition border flex flex-col items-center justify-center ${
                         !isMainPhase
                           ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                           : currentBuildMode === 'city'
                            ? 'bg-purple-200 border-purple-400 text-purple-900 ring-2 ring-purple-300'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300'
                    }`}
                 >
                     <span className="text-sm">Build City</span>
                 </button>
            </div>
            
             <div className="flex gap-2 mb-3">
                 <button 
                    onClick={onTradeClick}
                    disabled={!isMainPhase}
                    className={`flex-1 py-3 font-bold rounded-lg transition border flex items-center justify-center gap-2 ${
                        !isMainPhase
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300'
                    }`}
                 >
                     <span>🔄</span> Trade
                 </button>
                 <button 
                    onClick={onBuyDevCard}
                    disabled={!isMainPhase}
                     className={`flex-1 py-3 font-bold rounded-lg transition border flex items-center justify-center gap-2 ${
                        !isMainPhase
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300'
                    }`}
                 >
                     <span>💰</span> Buy Card
                 </button>
             </div>

             <button 
                onClick={onOpenDevCards}
                className="w-full mb-3 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-lg transition border border-indigo-200 flex items-center justify-center gap-2"
             >
                 <span>🃏</span> My Cards
             </button>

            <button 
                onClick={onEndTurn}
                disabled={loading || isSetupPhase}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg transition transform hover:scale-[1.02]"
            >
                {isSetupPhase ? 'Auto End Turn' : 'End Turn'}
            </button>
        </div>
    );
};
