import React from 'react';
import type { Tile, WeatherBuff } from '../../types/game';

interface HexTileProps {
    tile: Tile;
    buffs: WeatherBuff[] | null;
    onClick: () => void;
}

export const HexTile: React.FC<HexTileProps> = ({ tile, buffs, onClick }) => {
    // Check if any buff targets this tile's resource
    const activeBuff = buffs?.find(b => b.target === tile.resource_type);
    
    // Simple color mapping
    const colors: Record<string, string> = {
        wood: 'bg-green-700',
        brick: 'bg-red-700',
        sheep: 'bg-lime-400',
        wheat: 'bg-yellow-400',
        ore: 'bg-gray-600',
        desert: 'bg-yellow-200'
    };

    const bgColor = colors[tile.resource_type] || 'bg-gray-300';
    
    // Hex shape via clip-path or CSS
    // For simplicity, using a square with "hexagon" visual tweaks or just a styled div
    // A proper hex requires complex CSS or SVG. Let's use SVG for better rendering.
    
    /* 
       Hexagon geometry:
       Width = sqrt(3) * size
       Height = 2 * size
       Here we assume size = 50px approx
    */

    return (
        <div 
            className={`relative w-24 h-24 flex items-center justify-center cursor-pointer transform hover:scale-105 transition-all
            ${activeBuff ? 'ring-4 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
            onClick={onClick}
            title={`${tile.resource_type} (${tile.number_token})`}
        >
             {/* SVG Hexagon */}
             <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
                <polygon 
                    points="50 0, 93.3 25, 93.3 75, 50 100, 6.7 75, 6.7 25" 
                    className={`${bgColor.replace('bg-', 'fill-')} stroke-white stroke-2`}
                    fill="currentColor"
                />
            </svg>

            {/* Content Overlay */}
            <div className="z-10 text-center pointer-events-none">
                 <div className="font-bold text-white drop-shadow-md capitalize text-sm">{tile.resource_type}</div>
                 <div className={`text-xl font-extrabold ${tile.number_token === 6 || tile.number_token === 8 ? 'text-red-500' : 'text-white'} drop-shadow-md bg-black/20 rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1`}>
                    {tile.number_token}
                 </div>
                 {activeBuff && (
                     <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1 rounded-full animate-bounce">
                         {activeBuff.amount > 0 ? '+' : ''}{activeBuff.amount}
                     </div>
                 )}
            </div>
        </div>
    );
};
