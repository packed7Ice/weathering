import React, { useMemo } from 'react';
import type { Tile, WeatherBuff, Construction, Player } from '../../types/game';
import { HexTile } from './HexTile';
import { ConstructionLayer } from './ConstructionLayer';

interface BoardProps {
    tiles: Tile[];
    weatherBuffs: WeatherBuff[] | null;
    buildMode: 'road' | 'settlement' | 'city' | null;
    onBuild: (type: 'road' | 'settlement' | 'city', locationId: string) => void;
    constructions: Construction[];
    players: Player[];
}

export const Board: React.FC<BoardProps> = ({ tiles, weatherBuffs, buildMode, onBuild, constructions, players }) => {
    // Hex Radius (Size from center to corner)
    const HEX_RADIUS = 50; 
    const HEX_WIDTH = HEX_RADIUS * Math.sqrt(3);
    const HEX_HEIGHT = HEX_RADIUS * 2;
    
    // Board Interaction State
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [transform, setTransform] = React.useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = React.useState(false);
    const lastMousePos = React.useRef<{ x: number, y: number } | null>(null);

    // Initial Fit Logic
    const fitToScreen = React.useCallback(() => {
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            const BASE_SIZE = 800; 
            // Fit with padding
            const newScale = Math.min(clientWidth / BASE_SIZE, clientHeight / BASE_SIZE) * 0.95;
            setTransform(prev => ({ ...prev, x: 0, y: 0, scale: newScale }));
        }
    }, []);

    React.useEffect(() => {
        fitToScreen();
        const observer = new ResizeObserver(fitToScreen);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [fitToScreen]);

    // Handlers
    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            setTransform(prev => {
                const scaleFactor = 1.1;
                const newScale = e.deltaY < 0 ? prev.scale * scaleFactor : prev.scale / scaleFactor;
                const clampedScale = Math.min(Math.max(newScale, 0.2), 5);
                return { ...prev, scale: clampedScale };
            });
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, []);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        if (!lastMousePos.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUp = React.useCallback(function onMouseUp() {
        setIsDragging(false);
        lastMousePos.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }, [handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        e.preventDefault(); 
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    React.useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !lastMousePos.current || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - lastMousePos.current.x;
        const dy = e.touches[0].clientY - lastMousePos.current.y;
        
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastMousePos.current = null;
    };

    const renderTiles = useMemo(() => {
        return tiles.map(tile => {
            // Pointy Top Hexagon Layout - 座標計算をConstructionLayerと統一
            // centerX = hexSize * sqrt(3) * (q + r/2)
            // centerY = hexSize * 1.5 * r
            const centerX = HEX_RADIUS * Math.sqrt(3) * (tile.q + tile.r / 2);
            const centerY = HEX_RADIUS * 1.5 * tile.r;

            return (
                <div 
                    key={tile.id} 
                    style={{ 
                        position: 'absolute', 
                        left: `calc(50% + ${centerX}px)`, 
                        top: `calc(50% + ${centerY}px)`, 
                        width: `${HEX_WIDTH}px`,
                        height: `${HEX_HEIGHT}px`,
                        transform: 'translate(-50%, -50%)' 
                    }}
                >
                    <HexTile 
                        tile={tile} 
                        buffs={weatherBuffs} 
                        onClick={() => console.log('Clicked tile', tile)}
                        width={HEX_WIDTH}
                        height={HEX_HEIGHT}
                    />
                </div>
            );
        });
    }, [tiles, weatherBuffs, HEX_RADIUS, HEX_WIDTH, HEX_HEIGHT]);

    return (
        <div 
            ref={containerRef} 
            className="as-board-container relative w-full h-full bg-[#2a7fa8] overflow-hidden rounded-xl shadow-inner border-4 border-[#1e5b7a] flex items-center justify-center touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Water/Background decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div 
                className="relative w-[800px] h-[800px] shrink-0 transition-transform duration-75 ease-linear pointer-events-none"
                style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
            >
                {/* Enable pointer events on children (tiles) */}
                <div className="w-full h-full pointer-events-auto">
                    {renderTiles}
                </div>
                
                {/* Construction Layer (Overlay) */}
                <ConstructionLayer 
                    tiles={tiles}
                    constructions={constructions}
                    buildMode={buildMode}
                    onBuild={onBuild}
                    players={players}
                    hexSize={HEX_RADIUS}
                />
            </div>
            
            {/* Controls Overlay (Optional: Reset Zoom) */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); fitToScreen(); }}
                    className="bg-white/80 p-2 rounded-full shadow hover:bg-white text-gray-700 text-xs font-bold"
                >
                    Reset View
                </button>
            </div>
        </div>
    );
};
