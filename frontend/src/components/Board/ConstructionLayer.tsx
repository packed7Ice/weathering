import React, { useMemo } from 'react';
import type { Tile, Construction, Player } from '../../types/game';

interface ConstructionLayerProps {
    tiles: Tile[];
    constructions: Construction[];
    buildMode: 'road' | 'settlement' | 'city' | null;
    onBuild: (type: 'road' | 'settlement' | 'city', locationId: string) => void;
    players: Player[];
    hexSize?: number;
}

const HEX_SIZE = 60;

export const ConstructionLayer: React.FC<ConstructionLayerProps> = ({ 
    tiles, 
    constructions, 
    buildMode, 
    onBuild, 
    players,
    hexSize = HEX_SIZE 
}) => {

    // Helper: Player Color
    const getPlayerColorClass = (playerId: number, type: 'fill' | 'stroke' | 'road') => {
        const player = players.find(p => p.id === playerId);
        const color = player ? player.color : 'gray';
        
        switch (color) {
            case 'red':
                if (type === 'road') return 'stroke-red-600';
                return type === 'fill' ? 'fill-red-600' : 'stroke-white';
            case 'blue':
                if (type === 'road') return 'stroke-blue-600';
                return type === 'fill' ? 'fill-blue-600' : 'stroke-white';
            case 'green':
                if (type === 'road') return 'stroke-green-600';
                return type === 'fill' ? 'fill-green-600' : 'stroke-white';
            case 'orange':
                if (type === 'road') return 'stroke-orange-500';
                return type === 'fill' ? 'fill-orange-500' : 'stroke-white';
            case 'white': // Adjust for visibility
                if (type === 'road') return 'stroke-slate-200';
                return type === 'fill' ? 'fill-slate-100' : 'stroke-slate-600';
            default:
                if (type === 'road') return 'stroke-gray-500';
                return type === 'fill' ? 'fill-gray-500' : 'stroke-white';
        }
    };

    // 1. Calculate Unique Coordinate Map for Vertices and Edges
    const { uniqueVertices, uniqueEdges } = useMemo(() => {
        const vMap = new Map<string, { x: number, y: number, ids: string[] }>();
        const eMap = new Map<string, { x1: number, y1: number, x2: number, y2: number, ids: string[] }>();

        tiles.forEach(tile => {
            const centerX = hexSize * Math.sqrt(3) * (tile.q + tile.r / 2);
            const centerY = hexSize * 1.5 * tile.r;

            // Vertices
            // 0: Top, 1: TR, 2: BR, 3: Bottom, 4: BL, 5: TL
            // Angles: -90, -30, 30, 90, 150, 210 (deg)
            for (let i = 0; i < 6; i++) {
                const angleDeg = -90 + 60 * i;
                const angleRad = (Math.PI / 180) * angleDeg;
                const vx = centerX + hexSize * Math.cos(angleRad);
                const vy = centerY + hexSize * Math.sin(angleRad);
                
                // Key for deduplication (snap to integer/precision)
                const key = `${Math.round(vx)},${Math.round(vy)}`;
                const id = `${tile.q}_${tile.r}_v_${i}`;

                if (vMap.has(key)) {
                    vMap.get(key)!.ids.push(id);
                } else {
                    vMap.set(key, { x: vx, y: vy, ids: [id] });
                }
            }
        });

        // Edges
        // Needs vertices first to determine start/end
        // But we iterate per tile, so we can re-calc or use vMap lookups if we are careful about order.
        // Let's re-calc locally to be safe and independent.
        tiles.forEach(tile => {
            const centerX = hexSize * Math.sqrt(3) * (tile.q + tile.r / 2);
            const centerY = hexSize * 1.5 * tile.r;
            
            const getV = (i: number) => {
                const angleDeg = -90 + 60 * i;
                const angleRad = (Math.PI / 180) * angleDeg;
                return { 
                    x: centerX + hexSize * Math.cos(angleRad), 
                    y: centerY + hexSize * Math.sin(angleRad) 
                };
            };

            for (let i = 0; i < 6; i++) {
                const v1 = getV(i);
                const v2 = getV((i + 1) % 6);
                
                // Midpoint key for deduplication
                const mx = (v1.x + v2.x) / 2;
                const my = (v1.y + v2.y) / 2;
                const key = `${Math.round(mx)},${Math.round(my)}`;
                const id = `${tile.q}_${tile.r}_e_${i}`;

                if (eMap.has(key)) {
                    eMap.get(key)!.ids.push(id);
                } else {
                    eMap.set(key, { x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y, ids: [id] });
                }
            }
        });

        return { uniqueVertices: Array.from(vMap.values()), uniqueEdges: Array.from(eMap.values()) };
    }, [tiles, hexSize]);


    // 2. Render Loop
    // Iterate over unique coordinates.
    // Check if ANY of the ids are in constructions.
    
    // Draw Roads (Edges)
    const roadElements = uniqueEdges.map((edge, idx) => {
        // Find existing construction matching ANY of the edge's IDs
        const existing = constructions.find(c => c.type === 'road' && edge.ids.includes(c.location_id));
        
        // Interaction Logic
        // Show spot if: Build Mode is Road OR No Mode (User requested only showing interactables appropriately?
        // User request: "表示位置を常に表示するのではなく、オブジェクト設置時に、既に設置しているオブジェクトを表示するようにするだけにしてください。"
        // Interpretation:
        // - Existing objects: ALWAYS visible (or at least when building anything, to see connections).
        // - Build spots: Only visible when in specific build mode, AND empty.

        const isModeRoad = buildMode === 'road';
        if (existing) {
            const className = getPlayerColorClass(existing.player_id, 'road');
            return (
                <line 
                    key={`road-${idx}`}
                    x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
                    className={`${className} pointer-events-none`}
                    strokeWidth="6"
                    strokeLinecap="round"
                />
            );
        } else if (isModeRoad) {
            // Interactable Spot
            return (
                <g 
                    key={`road-spot-${idx}`}
                    onClick={(e) => { e.stopPropagation(); onBuild('road', edge.ids[0]); }}
                    className="cursor-pointer group"
                >
                     {/* Wider transparent line for easier clicking */}
                    <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke="transparent" strokeWidth="20" />
                    <circle cx={(edge.x1+edge.x2)/2} cy={(edge.y1+edge.y2)/2} r="8" className="fill-orange-300/50 group-hover:fill-orange-500 transition-colors" />
                </g>
            );
        }
        return null;
    });

    // Draw Settlements/Cities (Vertices)
    const vertexElements = uniqueVertices.map((vert, idx) => {
        const existing = constructions.find(c => (c.type === 'settlement' || c.type === 'city') && vert.ids.includes(c.location_id));
        
        const isSettlementMode = buildMode === 'settlement';
        const isCityMode = buildMode === 'city';
        if (existing) {
             const fillClass = getPlayerColorClass(existing.player_id, 'fill');
             const strokeClass = getPlayerColorClass(existing.player_id, 'stroke');

             if (existing.type === 'city') {
                 // Upgrade?
                 // Wait, if it's already a city, nothing to do.
                 return (
                    <rect 
                        key={`city-${idx}`}
                        x={vert.x - 10} y={vert.y - 10} width="20" height="20"
                        className={`${fillClass} ${strokeClass} stroke-2 shadow-sm transform rotate-45 origin-center pointer-events-none`}
                    />
                 );
             } else {
                 // It's a Settlement
                 // Show upgrade option if in City Mode
                 if (isCityMode) {
                     // Check ownership (in frontend, we might not know 'my' player id easily without passing it or checking gameState.activePlayerIndex)
                     // But server validates. Let's allow click.
                     return (
                        <g key={`settlement-upg-${idx}`}>
                             {/* The existing settlement */}
                            <rect 
                                x={vert.x - 6} y={vert.y - 6} width="12" height="12"
                                className={`${fillClass} ${strokeClass} stroke-1 pointer-events-none`}
                            />
                            {/* Upgrade Overlay */}
                            <g 
                                onClick={(e) => { e.stopPropagation(); onBuild('city', existing.location_id); }}
                                className="cursor-pointer group"
                            >
                                <circle cx={vert.x} cy={vert.y} r="25" fill="transparent" />
                                <circle cx={vert.x} cy={vert.y} r="16" className="fill-none stroke-purple-500 stroke-2 group-hover:fill-purple-500/30 animate-pulse transition-colors" />
                            </g>
                        </g>
                     );
                 }

                 // Just static settlement
                 return (
                    <rect 
                        key={`settlement-${idx}`}
                        x={vert.x - 6} y={vert.y - 6} width="12" height="12"
                        className={`${fillClass} ${strokeClass} stroke-1 pointer-events-none`}
                    />
                 );
             }
        } else if (isSettlementMode) {
            // Empty Spot for Settlement
            return (
                <g 
                    key={`settlement-spot-${idx}`} 
                    onClick={(e) => { e.stopPropagation(); onBuild('settlement', vert.ids[0]); }}
                    className="cursor-pointer group"
                >
                    <circle cx={vert.x} cy={vert.y} r="20" fill="transparent" />
                    <circle cx={vert.x} cy={vert.y} r="12" className="fill-white/50 group-hover:fill-white stroke-gray-500 stroke-1 transition-colors" />
                </g>
            );
        }
        return null;
    });

    return (
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            {/* Enable pointer events only on interactive elements */}
            {/* SVG座標をボードの中心（50%, 50%）に合わせる */}
            <g className="pointer-events-auto" style={{ transform: 'translate(50%, 50%)' }}>
                {roadElements}
                {vertexElements}
            </g>
        </svg>
    );
};
