import * as api from '@/shared/lib/api/api';

export type TableCurrency = 'TON' | 'STARS';

export interface TableState {
    ownerId: string;
    participants: string[];
    maxPlayers: number;
    currency: TableCurrency;
    betAmount: number;
    createdAt: number;
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

class MultiplayerService {
    async createTable(dto: CreateTableDto): Promise<CreateTableResponse> {
        const response = await api.$authHost.post<CreateTableResponse>('/multiplayer/table', dto);
        return response.data;
    }

    async getTable(ownerId: string): Promise<GetTableResponse> {
        const response = await api.$authHost.get<GetTableResponse>(`/multiplayer/table/${ownerId}`);
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
