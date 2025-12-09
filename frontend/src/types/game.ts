export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore' | 'desert';
export type DevCardType = 'knight' | 'vp_point' | 'road_building' | 'year_of_plenty' | 'monopoly';

export interface DevCard {
    type: DevCardType;
    bought_turn: number;
    played: boolean;
}

export interface Player {
    id: number;
    game_id: string;
    color: string;
    name: string;
    score: number;
    resource_wood: number;
    resource_brick: number;
    resource_sheep: number;
    resource_wheat: number;
    resource_ore: number;
    dev_cards?: DevCard[];
}

export interface Tile {
    id: number;
    q: number;
    r: number;
    resource_type: ResourceType;
    number_token: number;
}

export interface Construction {
    id: number;
    type: 'road' | 'settlement' | 'city';
    location_id: string; // "q,r,dir" or similar
    player_id: number;
}

export interface WeatherBuff {
    type: string;
    target: string;
    amount: number;
    reason: string;
}

export interface WeatherData {
    condition: string;
    temp: number;
    buffs: WeatherBuff[];
}

export interface GameState {
    gameId: string;
    turnCount: number;
    season: string;
    activePlayerIndex: number;
    turnPhase: 'roll' | 'main';
    players: Player[];
    board: Tile[];
    constructions: Construction[];
}

export interface ApiResponse {
    status?: string; // Add status as it's returned by PHP
    gameState: GameState;
    weather: WeatherData | null;
    actionResponse?: {
        message?: string;
        dice?: number;
        produced?: Record<number, Record<string, number>>;
        game_over?: boolean;
        winner?: {
            id: number;
            name: string;
            score: number;
        };
        card?: DevCardType;
    }; 
    error?: string;
}
