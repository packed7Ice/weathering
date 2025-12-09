import React, { useState } from 'react';
import type { GameState, DevCard, ResourceType } from '../../types/game';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    gameState: GameState;
    activePlayerId: number;
    onPlayCard: (cardType: string, payload?: Record<string, unknown>) => void;
}

const CARD_NAMES: Record<string, string> = {
    knight: 'Knight (騎士)',
    vp_point: 'Victory Point (得点)',
    road_building: 'Road Building (街道建設)',
    year_of_plenty: 'Year of Plenty (収穫)',
    monopoly: 'Monopoly (独占)'
};

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];

export const DevCardModal: React.FC<Props> = ({ isOpen, onClose, gameState, activePlayerId, onPlayCard }) => {
    const player = gameState.players.find(p => p.id === activePlayerId);
    const cards = player?.dev_cards || [];
    
    // Group cards
    const cardCounts = cards.reduce((acc, card) => {
        if (!acc[card.type]) acc[card.type] = { count: 0, playable: 0, cards: [] };
        acc[card.type].count++;
        acc[card.type].cards.push(card);
        // Playable if not played AND not bought this turn (unless VP - though VP is auto usually, but manual here for now)
        // Rule: Cannot play card bought this turn.
        if (!card.played && card.bought_turn < gameState.turnCount) {
            acc[card.type].playable++;
        }
        return acc;
    }, {} as Record<string, { count: number, playable: number, cards: DevCard[] }>);

    const [selectedCardType, setSelectedCardType] = useState<string | null>(null);
    const [yopResources, setYopResources] = useState<ResourceType[]>([]); // For Year of Plenty
    const [monopolyResource, setMonopolyResource] = useState<ResourceType | null>(null); // For Monopoly

    if (!isOpen || !player) return null;

    const handlePlayClick = (type: string) => {
        if (type === 'year_of_plenty') {
             setSelectedCardType(type);
             setYopResources([]);
        } else if (type === 'monopoly') {
             setSelectedCardType(type);
             setMonopolyResource(null);
        } else if (type === 'knight') {
            // Immediate (later will require robber target)
            if (window.confirm("騎士カードを使用しますか？(盗賊の移動は未実装)")) {
                onPlayCard(type);
                onClose();
            }
        } else if (type === 'road_building') {
             alert("街道建設はまだ実装されていません");
        } else {
             // VP usually automatic or revealed.
             alert("得点カードは自動的に計算されます");
        }
    };

    const submitYearOfPlenty = () => {
        if (yopResources.length !== 2) return;
        onPlayCard('year_of_plenty', { resources: yopResources });
        setSelectedCardType(null);
        onClose();
    };

    const submitMonopoly = () => {
        if (!monopolyResource) return;
        onPlayCard('monopoly', { resource: monopolyResource });
        setSelectedCardType(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border-4 border-slate-700 max-h-[90vh] overflow-y-auto">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center rounded-t-lg">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span>🃏</span> Development Cards (手札)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="p-6">
                    {/* Card Selection Mode */}
                    {!selectedCardType && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(cardCounts).map(([type, info]) => (
                                <div key={type} className={`border-2 rounded-lg p-4 flex flex-col justify-between ${info.playable > 0 ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <div>
                                        <h3 className="font-bold text-lg mb-1">{CARD_NAMES[type] || type}</h3>
                                        <div className="text-sm text-gray-600">
                                            所持数: {info.count} <br/>
                                            使用可能: <span className={info.playable > 0 ? 'text-indigo-600 font-bold' : ''}>{info.playable}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlePlayClick(type)}
                                        disabled={info.playable === 0}
                                        className={`mt-3 py-2 px-4 rounded font-bold text-sm transition ${
                                            info.playable > 0 
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                        使用する
                                    </button>
                                </div>
                            ))}
                            {Object.keys(cardCounts).length === 0 && (
                                <div className="col-span-2 text-center text-gray-400 py-8">
                                    発展カードを持っていません
                                </div>
                            )}
                        </div>
                    )}

                    {/* Year of Plenty Form */}
                    {selectedCardType === 'year_of_plenty' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold border-b pb-2">収穫 (Year of Plenty): 資源を2つ選んでください</h3>
                            <div className="flex flex-wrap gap-2">
                                {RESOURCES.map(res => (
                                    <button 
                                        key={res}
                                        onClick={() => setYopResources(prev => [...prev.slice(0, 1), res])} // Keep max 2
                                        className={`px-4 py-2 rounded capitalize border-2 font-bold ${
                                            yopResources.includes(res) ? 'border-green-500 bg-green-100' : 'border-gray-200'
                                        }`}
                                    >
                                        {res}
                                    </button>
                                ))}
                            </div>
                            <div className="p-3 bg-gray-100 rounded">
                                選択中: {yopResources.join(', ') || 'なし'}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedCardType(null)} className="px-4 py-2 text-gray-600">キャンセル</button>
                                <button 
                                    onClick={submitYearOfPlenty} 
                                    disabled={yopResources.length !== 2}
                                    className="px-6 py-2 bg-green-600 text-white rounded font-bold disabled:bg-gray-300"
                                >
                                    実行
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Monopoly Form */}
                    {selectedCardType === 'monopoly' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold border-b pb-2">独占 (Monopoly): 資源を1つ選んでください</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {RESOURCES.map(res => (
                                    <button 
                                        key={res}
                                        onClick={() => setMonopolyResource(res)}
                                        className={`px-4 py-3 rounded capitalize border-2 font-bold ${
                                            monopolyResource === res ? 'border-purple-500 bg-purple-100 text-purple-900 ring-2' : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {res}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setSelectedCardType(null)} className="px-4 py-2 text-gray-600">キャンセル</button>
                                <button 
                                    onClick={submitMonopoly} 
                                    disabled={!monopolyResource}
                                    className="px-6 py-2 bg-purple-600 text-white rounded font-bold disabled:bg-gray-300"
                                >
                                    すべての {monopolyResource} を奪う
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
