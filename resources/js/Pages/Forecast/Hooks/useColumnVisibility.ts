import { useState, useEffect } from 'react';

export function useColumnVisibility<T extends Record<string, boolean>>(storageKey: string, defaultCols: T) {
    const [visibleCols, setVisibleCols] = useState<T>(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try { return { ...defaultCols, ...JSON.parse(saved) }; } 
            catch (e) { return defaultCols; }
        }
        return defaultCols;
    });

    // auto save to localStorage whenever columns change
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(visibleCols));
    }, [visibleCols, storageKey]);

    const toggleColumn = (colName: keyof T) => {
        setVisibleCols(prev => ({ ...prev, [colName]: !prev[colName] }));
    };

    return { visibleCols, toggleColumn };
}