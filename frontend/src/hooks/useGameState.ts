import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';
import type { GameState, ApiResponse } from '../types/game';

export function useGameState(gameId: string | null) {
    const { get, post, loading } = useApiClient();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [weather, setWeather] = useState<ApiResponse['weather']>(null);

    const refreshState = useCallback(async () => {
        if (!gameId) return;
        const data = await get<ApiResponse>('/game/state.php', { gameId });
        if (data) {
            setGameState(data.gameState);
            setWeather(data.weather);
        }
    }, [gameId, get]);

    const resolveTurn = useCallback(async () => {
        if (!gameId) return;
        // The original instruction snippet implies a change to the payload and return type.
        // Assuming the new `resolveAction` is the more generic way, `resolveTurn` can be simplified
        // or adapted to use the new `ApiResponse` structure.
        // Based on the snippet, it seems `resolve_turn.php` now returns `ApiResponse` and expects an `action`.
        const res = await post<ApiResponse>('/game/resolve_turn.php', { gameId, action: 'end_turn' });
        if (res && res.gameState) {
            setGameState(res.gameState);
            // Optionally show toast for turn end
            refreshState(); // Still good to refresh for potential weather changes or other state updates
        }
    }, [gameId, post, refreshState]);

    const resolveAction = useCallback(async (action: string, payload: object = {}) => {
        if (!gameId) return null; // Return null if no gameId
        const res = await post<ApiResponse>('/game/resolve_turn.php', { gameId, action, ...payload });
        if (res && res.gameState) {
            setGameState(res.gameState);
            refreshState(); // Refresh to get new weather or other state potentially
            return res.actionResponse; // Assuming ApiResponse can contain actionResponse
        }
        return null;
    }, [gameId, post, refreshState]);

    useEffect(() => {
        if (gameId) {
            // refreshState is async and handles its own state updates
            // eslint-disable-next-line
            void refreshState();
        }
    }, [gameId, refreshState]);

    return { gameState, weather, loading, resolveTurn, resolveAction, refreshState };
}
