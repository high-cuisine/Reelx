'use client';

import cls from './inventory.module.scss';
import { useInventory } from './hooks/useInventory';
import { useGameDataModal } from '../../hooks/useGameDataModal';
import { useNftModal } from '../../hooks/useNftModal';
import { prepareGameModalData } from '../../helpers/gameDataHelper';
import { GiftItem } from './components/GiftItem';
import { GameHistoryItem } from './components/GameHistoryItem';
import { GameDataModal } from '../GameDataModal/GameDataModal';
import { NftModal } from '../NftModal/NftModal';
import type { UserGift } from '@/entites/user/api/api';
import type { GameWinNft } from '@/entites/user/interface/game.interface';

function mapWinNftToUserGift(w: GameWinNft): UserGift {
    return {
        id: w.id,
        giftName: w.giftName,
        image: w.image ?? undefined,
        lottieUrl: w.lottieUrl || undefined,
        price: w.price ?? undefined,
        isOut: false,
        createdAt: '',
    };
}

export const Inventory = () => {
    const { activeTab, setActiveTab, historyGames, inventoryGifts, isLoading, refetchGifts } = useInventory();
    const { isOpen: isGameModalOpen, selectedGame, openModal: openGameModal, closeModal: closeGameModal } = useGameDataModal();
    const { isOpen: isNftModalOpen, selectedNft, openModal: openNftModal, closeModal: closeNftModal } = useNftModal();

    const modalData = selectedGame ? prepareGameModalData(selectedGame) : null;

    const handleAfterNftAction = () => {
        refetchGifts();
    };

    return (
        <div className={cls.inventory}>
            <div className={cls.tabBar}>
                <button
                    className={`${cls.tab} ${activeTab === 'inventory' ? cls.tabActive : ''}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    Инвентарь
                </button>
                <button
                    className={`${cls.tab} ${activeTab === 'history' ? cls.tabActive : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    История
                </button>
            </div>

            {activeTab === 'history' && (
                <div className={cls.historyList}>
                    {isLoading ? (
                        <div className={cls.emptyState}>Загрузка...</div>
                    ) : historyGames.length === 0 ? (
                        <div className={cls.emptyState}>История пуста</div>
                    ) : (
                        historyGames.map((game) => (
                            <GameHistoryItem key={game.id} game={game} onClick={openGameModal} />
                        ))
                    )}
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className={cls.inventoryList}>
                    {isLoading ? (
                        <div className={cls.emptyState}>Загрузка...</div>
                    ) : inventoryGifts.length === 0 ? (
                        <div className={cls.emptyState}>Инвентарь пуст</div>
                    ) : (
                        inventoryGifts.map((gift) => (
                            <GiftItem 
                                key={gift.id} 
                                gift={gift} 
                                onClick={openNftModal}
                            />
                        ))
                    )}
                </div>
            )}

            {modalData && (
                <GameDataModal
                    isOpen={isGameModalOpen}
                    onClose={closeGameModal}
                    gameId={modalData.gameId}
                    gameType={modalData.gameType}
                    date={modalData.date}
                    time={modalData.time}
                    bet={modalData.bet}
                    betCurrency={modalData.betCurrency}
                    chance={modalData.chance}
                    winner={modalData.winner}
                    winNft={modalData.winNft}
                    onWinPrizeClick={(w) => openNftModal(mapWinNftToUserGift(w))}
                />
            )}

            <NftModal
                isOpen={isNftModalOpen}
                onClose={closeNftModal}
                nft={selectedNft}
                onSell={handleAfterNftAction}
                onWithdraw={handleAfterNftAction}
            />
        </div>
    );
};
