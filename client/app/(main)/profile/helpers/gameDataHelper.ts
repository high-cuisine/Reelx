import { Game, GameType, GameCurrency } from '@/entites/user/interface/game.interface';

export const getGameTypeName = (type: GameType): string => {
    const typeNames: Record<GameType, string> = {
        solo: 'Соло игра',
        upgrate: 'Апгрейд',
        pvp: 'Стол',
    };
    return typeNames[type] || type;
};

export const formatGameDate = (iso: string): { date: string; time: string } => {
    const dateObj = new Date(iso);
    if (Number.isNaN(dateObj.getTime())) {
        return { date: '', time: '' };
    }

    const date = dateObj.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
    });

    const time = dateObj.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return { date, time };
};

export const formatGameDateTime = (iso: string): string => {
    const dateObj = new Date(iso);
    if (Number.isNaN(dateObj.getTime())) return '';

    return dateObj.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const getGameIdShort = (id: string): string => {
    // Берем последние 6 символов или весь id если короче
    return id.length > 6 ? id.slice(-6) : id;
};

export const formatBetAmount = (amount: number, currency: GameCurrency): string => {
    return `${amount.toFixed(2)} ${currency}`;
};

export interface GameModalData {
    gameId: string;
    gameType: string;
    date: string;
    time: string;
    bet: number;
    betCurrency: GameCurrency;
    chance: string;
    winner: string;
    /** Приз отображается только в попапе игры */
    winNft?: Game['winNft'];
}

export const prepareGameModalData = (game: Game): GameModalData => {
    const { date, time } = formatGameDate(game.createdAt);

    let chance = '—';
    let winner = '—';
    if (game.type === 'solo') {
        chance = '100%';
        winner = 'Вы';
    } else if (game.type === 'upgrate') {
        winner = game.winNft ? 'Вы' : 'Проигрыш';
    } else if (game.type === 'pvp') {
        winner = game.winNft ? 'Победа' : 'Проигрыш';
    }

    return {
        gameId: getGameIdShort(game.id),
        gameType: getGameTypeName(game.type),
        date,
        time,
        bet: game.priceAmount,
        betCurrency: game.priceType,
        chance,
        winner,
        winNft: game.winNft,
    };
};
