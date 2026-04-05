import * as api from '@/shared/lib/api/api';

export type TableCurrency = 'TON' | 'STARS';

export interface TableParticipant {
    userId: string;
    username: string;
    photoUrl: string | null;
}

export type TableGamePhase = 'lobby' | 'playing' | 'round_break' | 'finished';

export interface TableWinnerPrize {
    giftId: string;
    name: string;
    image?: string | null;
    priceTon?: number;
    lottieUrl?: string | null;
}

export interface TableGameState {
    phase: TableGamePhase;
    readyUserIds: string[];
    activeUserIds: string[];
    lastEliminatedUserId: string | null;
    lastEliminatedSectorIndex: number | null;
    winnerUserId: string | null;
    round: number;
    winnerPrizeDispatched?: boolean;
    winnerPrize?: TableWinnerPrize | null;
    /** Сумма банка в TON (для WinModal). */
    potTon?: number;
}

export interface TableState {
    ownerId: string;
    participants: TableParticipant[];
    maxPlayers: number;
    currency: TableCurrency;
    betAmount: number;
    createdAt: number;
    /** С сервера приходит всегда после обновления API; для старых кэшей см. defaultTableGameClient. */
    game?: TableGameState;
}

export interface CreateTableDto {
    currency: TableCurrency;
    betAmount: number;
    maxPlayers: number;
}

export interface CreateTableResponse {
    success: boolean;
    table: TableState;
}

export interface GetTableResponse {
    success: boolean;
    table: TableState;
}

export interface ListTablesResponse {
    success: boolean;
    tables: TableState[];
}

export interface LeaveTableResponse {
    success: boolean;
    table: TableState | null;
    empty?: boolean;
}

class MultiplayerService {
    async createTable(dto: CreateTableDto): Promise<CreateTableResponse> {
        const response = await api.$authHost.post<CreateTableResponse>('/multiplayer/table', dto);
        return response.data;
    }

    async getTable(ownerId: string): Promise<GetTableResponse> {
        const response = await api.$authHost.get<GetTableResponse>(
            `/multiplayer/table/${encodeURIComponent(ownerId)}`,
        );
        return response.data;
    }

    async joinTable(ownerId: string): Promise<GetTableResponse> {
        const response = await api.$authHost.post<GetTableResponse>(
            `/multiplayer/table/${encodeURIComponent(ownerId)}/join`,
        );
        return response.data;
    }

    async leaveTable(ownerId: string): Promise<LeaveTableResponse> {
        const response = await api.$authHost.post<LeaveTableResponse>(
            `/multiplayer/table/${encodeURIComponent(ownerId)}/leave`,
        );
        return response.data;
    }

    async listTables(): Promise<ListTablesResponse> {
        const response = await api.$authHost.get<ListTablesResponse>('/multiplayer/tables');
        return response.data;
    }

    async deleteTable(): Promise<{ success: boolean }> {
        const response = await api.$authHost.delete<{ success: boolean }>('/multiplayer/table');
        return response.data;
    }
}

export const multiplayerService = new MultiplayerService();
