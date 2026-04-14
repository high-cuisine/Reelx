export type WinsItem = {
  image: string;
  name?: string;
  createdAt: number; // ms epoch
  source: 'win' | 'random';
};

export type WinsInitPayload = { items: WinsItem[] };
export type WinsUpdatePayload = { item: WinsItem; items: WinsItem[] };

