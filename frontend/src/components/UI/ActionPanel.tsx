import type { GameState } from "../../types/game";

interface Props {
    onEndTurn: () => void;
    onRollDice: () => void;
    onSetBuildMode: (mode: 'road' | 'settlement' | null) => void;
    currentBuildMode: 'road' | 'settlement' | null;
    loading: boolean;
    gameState?: GameState | null;
}

export const ActionPanel = ({ onEndTurn, onRollDice, onSetBuildMode, currentBuildMode, loading }: Props) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span>Actions</span>
            </h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
                 <button 
                  onClick={onRollDice}
                  disabled={loading}
                  className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition shadow-md flex flex-col items-center justify-center"
                 >
                     <span className="text-2xl">🎲</span>
                     <span className="text-sm">Roll Dice</span>
                 </button>
                 <button 
                    onClick={() => onSetBuildMode(currentBuildMode === 'road' ? null : 'road')}
                    className={`p-3 font-bold rounded-lg transition border flex flex-col items-center justify-center ${
                         currentBuildMode === 'road'
                         ? 'bg-orange-200 border-orange-400 text-orange-900 ring-2 ring-orange-300'
                         : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300'
                    }`}
                 >
                     <span className="text-sm">Build Road</span>
                 </button>
                 <button 
                    onClick={() => onSetBuildMode(currentBuildMode === 'settlement' ? null : 'settlement')}
                    className={`p-3 font-bold rounded-lg transition border flex flex-col items-center justify-center ${
                         currentBuildMode === 'settlement'
                         ? 'bg-green-200 border-green-400 text-green-900 ring-2 ring-green-300'
                         : 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300'
                    }`}
                 >
                     <span className="text-sm">Build Settlement</span>
                 </button>
                 <button className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg transition border border-blue-300">
                     Trade
                 </button>
            </div>

            <button 
                onClick={onEndTurn}
                disabled={loading}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg transition transform hover:scale-[1.02]"
            >
                End Turn
            </button>
        </div>
    );
};
