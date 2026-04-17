import { useState, useCallback, useRef } from 'react';
import { Game } from '@/entites/user/interface/game.interface';

export const useGameDataModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const clearSelectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openModal = useCallback((game: Game) => {
        if (clearSelectedTimerRef.current) {
            clearTimeout(clearSelectedTimerRef.current);
            clearSelectedTimerRef.current = null;
        }
        setSelectedGame(game);
        setIsOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        if (clearSelectedTimerRef.current) {
            clearTimeout(clearSelectedTimerRef.current);
        }
        clearSelectedTimerRef.current = setTimeout(() => {
            clearSelectedTimerRef.current = null;
            setSelectedGame(null);
        }, 300);
    }, []);

    return {
        isOpen,
        selectedGame,
        openModal,
        closeModal,
    };
};
