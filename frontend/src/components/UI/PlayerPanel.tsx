import React from 'react';
import type { GameState } from '../../types/game';

interface PlayerPanelProps {
    gameState: GameState | null;
    playerIndex: number;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ gameState, playerIndex }) => {
    if (!gameState) return null;

    const player = gameState.players[playerIndex];
    if (!player) return null;

    const resources = [
        { type: 'wood', val: player.resource_wood, color: 'bg-green-700' },
        { type: 'brick', val: player.resource_brick, color: 'bg-red-700' },
        { type: 'sheep', val: player.resource_sheep, color: 'bg-lime-400' },
        { type: 'wheat', val: player.resource_wheat, color: 'bg-yellow-400' },
        { type: 'ore', val: player.resource_ore, color: 'bg-gray-600' },
    ];

    return (
        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-gray-100">
            <h3 className="text-lg font-bold mb-2 flex justify-between">
                <span style={{ color: player.color }}>{player.name}</span>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-sm">VP: {player.score}</span>
            </h3>
            
            <div className="grid grid-cols-5 gap-2">
                {resources.map(res => (
                    <div key={res.type} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full ${res.color} flex items-center justify-center text-white font-bold text-xs shadow-sm mb-1`}>
                            {res.type[0].toUpperCase()}
                        </div>
                        <span className="font-mono font-bold text-gray-700">{res.val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
