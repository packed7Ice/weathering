import React from 'react';
import type { Tile, WeatherBuff } from '../../types/game';

interface HexTileProps {
    tile: Tile;
    buffs: WeatherBuff[] | null;
    onClick: () => void;
    width: number;
    height: number;
}

const COLORS: Record<string, string> = {
    wood: 'bg-green-700',
    brick: 'bg-red-700',
    sheep: 'bg-lime-400',
    wheat: 'bg-yellow-400',
    ore: 'bg-gray-600',
    desert: 'bg-yellow-200'
};

export const HexTile: React.FC<HexTileProps> = React.memo(({ tile, buffs, onClick, width, height }) => {
    // Check if any buff targets this tile's resource
    const activeBuff = buffs?.find(b => b.target === tile.resource_type);
    
    // Simple color mapping
    const bgColor = COLORS[tile.resource_type] || 'bg-gray-300';
    
    return (
        <div 
            className="hex-tile relative flex items-center justify-center group cursor-pointer"
            style={{ width: `${width}px`, height: `${height}px` }}
            onClick={onClick}
        >
            {/* Hexagon Shape CSS */}
            <div className={`w-full h-full ${bgColor} mask-hex transition-transform transform group-hover:scale-105 shadow-lg border-b-4 border-black/10`}></div>
            
            {/* Resource Icon / Number */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white drop-shadow-md">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">{tile.resource_type}</span>
                <span className={`text-xl font-extrabold ${tile.number_token === 6 || tile.number_token === 8 ? 'text-red-500' : 'text-white'}`}>
                    {tile.number_token !== 7 ? tile.number_token : ''}
                </span>
            </div>

            {/* Weather Buff Indicator */}
            {activeBuff && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-bounce">
                    +{activeBuff.amount}
                </div>
            )}
        </div>
    );
});
