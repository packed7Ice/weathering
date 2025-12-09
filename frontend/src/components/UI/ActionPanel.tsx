import type { GameState } from "../../types/game";

interface Props {
    onEndTurn: () => void;
    onRollDice: () => void;
    loading: boolean;
    gameState?: GameState | null;
}

export const ActionPanel = ({ onEndTurn, onRollDice, loading }: Props) => {
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
                 <button className="p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-lg transition border border-orange-300">
                     Build Road
                 </button>
                 <button className="p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-lg transition border border-orange-300">
                     Build Settlement
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
