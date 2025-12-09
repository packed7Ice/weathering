import React, { useMemo } from 'react';
import type { Tile, WeatherBuff, Construction } from '../../types/game';
import { HexTile } from './HexTile';

interface BoardProps {
    tiles: Tile[];
    weatherBuffs: WeatherBuff[] | null;
    buildMode: 'road' | 'settlement' | null;
    onBuild: (type: 'road' | 'settlement', locationId: string) => void;
    constructions: Construction[];
}

export const Board: React.FC<BoardProps> = ({ tiles, weatherBuffs, buildMode, onBuild, constructions }) => {
    // Determine bounds to center the board
    // For now assuming tiles are roughly centered around 0,0
    
    // Hex Size
    const hexSize = 55; // spacing
    const xStep = hexSize * 1.55; 
    const yStep = hexSize * 1.732 * 0.95; // adjusted for tight packing

    const renderTiles = useMemo(() => {
        return tiles.map(tile => {
            // Axial to Pixel
            // x = size * 3/2 * q
            // y = size * sqrt(3) * (r + q/2)
            const x = tile.q * xStep; 
            const y = (tile.r + tile.q / 2) * yStep;

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
    }, [tiles, weatherBuffs, buildMode, onBuild, constructions, xStep, yStep]);

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
