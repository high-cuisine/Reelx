import { useState, useCallback, useRef } from 'react';
import { UserGift } from '@/entites/user/api/api';

export const useNftModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedNft, setSelectedNft] = useState<UserGift | null>(null);
    const clearSelectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openModal = useCallback((nft: UserGift) => {
        if (clearSelectedTimerRef.current) {
            clearTimeout(clearSelectedTimerRef.current);
            clearSelectedTimerRef.current = null;
        }
        setSelectedNft(nft);
        setIsOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        if (clearSelectedTimerRef.current) {
            clearTimeout(clearSelectedTimerRef.current);
        }
        clearSelectedTimerRef.current = setTimeout(() => {
            clearSelectedTimerRef.current = null;
            setSelectedNft(null);
        }, 300);
    }, []);

    return {
        isOpen,
        selectedNft,
        openModal,
        closeModal,
    };
};
