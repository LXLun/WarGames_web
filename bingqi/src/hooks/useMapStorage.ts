import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';

export const useMapStorage = () => {
    const [mapBase64, setMapBase64] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const KEY = 'wargame_map';

    // Helper to convert File to Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const loadMap = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const storedMap = await localforage.getItem<string>(KEY);
            if (storedMap) {
                setMapBase64(storedMap);
            }
        } catch (err) {
            console.error('Error loading map:', err);
            setError('Failed to load map');
        } finally {
            setLoading(false);
        }
    }, []);

    const saveMap = useCallback(async (file: File) => {
        setLoading(true);
        setError(null);
        try {
            const base64 = await fileToBase64(file);
            await localforage.setItem(KEY, base64);
            setMapBase64(base64);
        } catch (err) {
            console.error('Error saving map:', err);
            setError('Failed to save map');
        } finally {
            setLoading(false);
        }
    }, []);

    const clearMap = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await localforage.removeItem(KEY);
            setMapBase64(null);
        } catch (err) {
            console.error('Error clearing map:', err);
            setError('Failed to clear map');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMap();
    }, [loadMap]);

    return {
        mapBase64,
        loading,
        error,
        saveMap,
        loadMap,
        clearMap
    };
};
