import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'global_show_totals';
const EVENT_NAME = 'totals-visibility-change';

export const useTotalsVisibility = () => {
    const [showTotals, setShowTotals] = useState<boolean>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved !== null ? saved === 'true' : true;
    });

    const updateVisibility = useCallback((value: boolean) => {
        setShowTotals(value);
        localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
    }, []);

    const toggleVisibility = useCallback(() => {
        updateVisibility(!showTotals);
    }, [showTotals, updateVisibility]);

    useEffect(() => {
        const handler = (event: Event) => {
            const custom = event as CustomEvent<boolean>;
            if (typeof custom.detail === 'boolean') {
                setShowTotals(custom.detail);
            }
        };
        window.addEventListener(EVENT_NAME, handler);
        return () => window.removeEventListener(EVENT_NAME, handler);
    }, []);

    return { showTotals, setShowTotals: updateVisibility, toggleVisibility };
};
