import React, { useState } from 'react';
import type { ResourceType, GameState } from '../../types/game';

type TradeResource = Exclude<ResourceType, 'desert'>;

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTrade: (offer: ResourceType, want: ResourceType) => void;
    gameState: GameState;
    activePlayerId: number;
}

export const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, onTrade, gameState, activePlayerId }) => {
    const [offer, setOffer] = useState<TradeResource>('wood');
    const [want, setWant] = useState<TradeResource>('brick');

    if (!isOpen) return null;

    const resources: TradeResource[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

    // Get current player resources
    const player = gameState.players.find(p => p.id === activePlayerId);
    if (!player) return null;

    const canAfford = (res: TradeResource) => {
        const count = player[`resource_${res}`] || 0;
        return count >= 4;
    };

    const handleTradeRaw = () => {
        onTrade(offer, want);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Bank Trade (4:1)</h2>
                
                <div className="flex justify-between items-center gap-4 mb-8">
                    {/* Offer Section */}
                    <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Give 4</label>
                        <select 
                            value={offer} 
                            onChange={(e) => setOffer(e.target.value as TradeResource)}
                            className="p-3 border rounded-lg bg-slate-50 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {resources.map(r => (
                                <option key={r} value={r} disabled={!canAfford(r)}>
                                    {r} {canAfford(r) ? `(${player[`resource_${r}`]})` : '(Low)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>

                    {/* Want Section */}
                    <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Get 1</label>
                        <select 
                            value={want} 
                            onChange={(e) => setWant(e.target.value as TradeResource)}
                            className="p-3 border rounded-lg bg-slate-50 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {resources.map(r => (
                                <option key={r} value={r} disabled={r === offer}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleTradeRaw}
                        disabled={!canAfford(offer) || offer === want}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold rounded-xl shadow-lg transition transform hover:scale-[1.02]"
                    >
                        Trade
                    </button>
                </div>
            </div>
        </div>
    );
};
