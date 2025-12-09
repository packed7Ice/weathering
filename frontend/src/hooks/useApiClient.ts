import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost/weathering/backend/public/api';

export function useApiClient() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const get = useCallback(async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> => {
        setLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams(params).toString();
            const url = `${API_BASE}${endpoint}?${query}`;
            const res = await fetch(url);
            if (!res.ok) {
                let errorMessage = `API Error: ${res.statusText}`;
                try {
                    const errorData = await res.json();
                    if (errorData && errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch {
                    // Ignore json parse error, keep status text
                }
                throw new Error(errorMessage);
            }
            const data = await res.json();
            return data as T;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const post = useCallback(async <T>(endpoint: string, body: unknown): Promise<T | null> => {
        setLoading(true);
        setError(null);
        try {
            const url = `${API_BASE}${endpoint}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                let errorMessage = `API Error: ${res.statusText}`;
                try {
                    const errorData = await res.json();
                    if (errorData && errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch {
                    // Ignore json parse error
                }
                throw new Error(errorMessage);
            }
            const data = await res.json();
            return data as T;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { get, post, loading, error };
}
