import type { Tile, WeatherBuff, Construction } from '../../types/game';

interface HexTileProps {
    tile: Tile;
    buffs: WeatherBuff[] | null;
    onClick: () => void;
    buildMode: 'road' | 'settlement' | 'city' | null;
    onBuild: (type: 'road' | 'settlement' | 'city', locationId: string) => void;
    constructions: Construction[];
}

export const HexTile: React.FC<HexTileProps> = ({ tile, buffs, onClick, buildMode, onBuild, constructions }) => {
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
    
    // Vertex Coordinates (Percentage 0-100)
    const vertices = [
        { x: 50, y: 0 },    // 0: Top
        { x: 93.3, y: 25 }, // 1: TR
        { x: 93.3, y: 75 }, // 2: BR
        { x: 50, y: 100 },  // 3: Bottom
        { x: 6.7, y: 75 },  // 4: BL
        { x: 6.7, y: 25 }   // 5: TL
    ];

    // Helper to generic ID
    const getVertexId = (index: number) => `${tile.q}_${tile.r}_v_${index}`;
    const getEdgeId = (index: number) => `${tile.q}_${tile.r}_e_${index}`;

    // Render Build Spots
    const renderBuildSpots = () => {
        const spots: React.ReactNode[] = [];

        // Vertices (Settlements & Cities)
        if (buildMode === 'settlement' || buildMode === 'city' || !buildMode) {
             vertices.forEach((v, i) => {
                 const id = getVertexId(i);
                 const existing = constructions.find(c => c.location_id === id && (c.type === 'settlement' || c.type === 'city'));
                 const isTaken = !!existing;

                 // Settlement Mode
                 if (buildMode === 'settlement' && !isTaken) {
                     spots.push(
                        <circle 
                            key={`v-${i}`} 
                            cx={v.x} cy={v.y} r="10" 
                            className="fill-white/50 hover:fill-white cursor-pointer stroke-gray-500 stroke-1"
                            onClick={(e) => { e.stopPropagation(); onBuild('settlement', id); }}
                        />
                     );
                 }

                 // City Mode (Upgrade)
                 if (buildMode === 'city' && existing && existing.type === 'settlement') {
                     spots.push(
                        <circle 
                            key={`upg-${i}`} 
                            cx={v.x} cy={v.y} r="14" 
                            className="fill-none stroke-purple-500 stroke-2 hover:fill-purple-500/30 cursor-pointer animate-pulse"
                            onClick={(e) => { e.stopPropagation(); onBuild('city', id); }}
                        />
                     );
                 }
                 
                 if (existing) {
                     if (existing.type === 'city') {
                         spots.push(
                            <rect 
                                key={`exist-v-${i}-city`}
                                x={v.x - 8} y={v.y - 8} width="16" height="16"
                                className="fill-purple-600 stroke-white stroke-2 shadow-sm transform rotate-45 origin-center"
                            />
                         );
                     } else {
                         spots.push(
                            <rect 
                                key={`exist-v-${i}-settlement`}
                                x={v.x - 5} y={v.y - 5} width="10" height="10"
                                className="fill-green-600 stroke-white stroke-1"
                            />
                         );
                     }
                 }
             });
        }

        // Edges (Roads)
        // Midpoints
        if (buildMode === 'road' || !buildMode) {
             vertices.forEach((v, i) => {
                 const nextV = vertices[(i + 1) % 6];
                 const mx = (v.x + nextV.x) / 2;
                 const my = (v.y + nextV.y) / 2;
                 const id = getEdgeId(i);
                 const existing = constructions.find(c => c.location_id === id && c.type === 'road');
                 const isTaken = !!existing;

                 if (buildMode === 'road' && !isTaken) {
                    spots.push(
                        <circle 
                            key={`e-${i}`} 
                            cx={mx} cy={my} r="6" 
                            className="fill-orange-300/50 hover:fill-orange-500 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); onBuild('road', id); }}
                        />
                    );
                 }

                 if (existing) {
                     spots.push(
                        <line 
                            key={`exist-e-${i}`}
                            x1={v.x} y1={v.y} x2={nextV.x} y2={nextV.y}
                            stroke="orange" strokeWidth="4"
                        />
                     );
                 }
             });
        }

        return spots;
    };

    return (
        <div 
            className={`relative w-24 h-24 flex items-center justify-center cursor-pointer transform hover:scale-105 transition-all
            ${activeBuff ? 'ring-4 ring-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
            onClick={onClick}
            title={`${tile.resource_type} (${tile.number_token})`}
        >
             {/* SVG Hexagon */}
             <svg viewBox="-5 -5 110 110" className="absolute inset-0 w-full h-full drop-shadow-md overflow-visible">
                <polygon 
                    points="50 0, 93.3 25, 93.3 75, 50 100, 6.7 75, 6.7 25" 
                    className={`${bgColor.replace('bg-', 'fill-')} stroke-white stroke-2`}
                    fill="currentColor"
                />
                {renderBuildSpots()}
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
