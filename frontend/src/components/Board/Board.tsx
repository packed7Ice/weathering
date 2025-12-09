import React, { useMemo } from 'react';
import type { Tile, WeatherBuff, Construction } from '../../types/game';
import { HexTile } from './HexTile';

interface BoardProps {
    tiles: Tile[];
    weatherBuffs: WeatherBuff[] | null;
    buildMode: 'road' | 'settlement' | 'city' | null;
    onBuild: (type: 'road' | 'settlement' | 'city', locationId: string) => void;
    constructions: Construction[];
}

export const Board: React.FC<BoardProps> = ({ tiles, weatherBuffs, buildMode, onBuild, constructions }) => {
    // Determine bounds to center the board
    // For now assuming tiles are roughly centered around 0,0
    
    // Hex Size
    // Hex Size (Increased for spacing)
    const hexSize = 60; 
    
    const renderTiles = useMemo(() => {
        return tiles.map(tile => {
            // Pointy Top Orientation Layout (to match HexTile SVG)
            // x = size * sqrt(3) * (q + r/2)
            // y = size * 3/2 * r
            const x = hexSize * Math.sqrt(3) * (tile.q + tile.r / 2);
            const y = hexSize * 1.5 * tile.r;

            return (
                <div 
                    key={tile.id} 
                    style={{ position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)' }}
                >
                    <HexTile 
                        tile={tile} 
                        buffs={weatherBuffs} 
                        buildMode={buildMode}
                        onBuild={onBuild}
                        constructions={constructions}
                        onClick={() => console.log('Clicked tile', tile)}
                    />
                </div>
            );
        });
    }, [tiles, weatherBuffs, buildMode, onBuild, constructions, hexSize]);

    return (
        <div className="relative w-full h-[600px] bg-[#2a7fa8] overflow-hidden rounded-xl shadow-inner border-4 border-[#1e5b7a]">
            {/* Water/Background decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
                {renderTiles}
            </div>
        </div>
    );
};
