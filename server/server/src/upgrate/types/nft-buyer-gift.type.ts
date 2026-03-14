export type NftBuyerGift = {
  id?: string;
  name?: string;
  image?: string;
  /** Может приходить как nanoTON строкой или как number */
  price?: string | number;
  /** Адрес NFT контракта (для purchase и записи в инвентарь) */
  address?: string;
  /** sale_address для API purchase */
  ownerAddress?: string;
  collection?: { address?: string; name?: string };
  lottie?: string;
};

export function toNftBuyerGift(raw: unknown): NftBuyerGift | null {
  if (raw == null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const id = typeof obj.id === 'string' ? obj.id : undefined;
  const name = typeof obj.name === 'string' ? obj.name : undefined;
  const image = typeof obj.image === 'string' ? obj.image : undefined;

  const price =
    typeof obj.price === 'string' || typeof obj.price === 'number'
      ? obj.price
      : undefined;

  const address = typeof obj.address === 'string' ? obj.address : undefined;
  const ownerAddress =
    typeof obj.ownerAddress === 'string' ? obj.ownerAddress : undefined;
  let collection: NftBuyerGift['collection'];
  if (obj.collection != null && typeof obj.collection === 'object') {
    const col = obj.collection as Record<string, unknown>;
    collection = {
      address: typeof col.address === 'string' ? col.address : undefined,
      name: typeof col.name === 'string' ? col.name : undefined,
    };
  }
  const lottie = typeof obj.lottie === 'string' ? obj.lottie : undefined;

  // если вообще нет полезных полей — считаем мусором
  if (id == null && name == null && image == null && price == null && address == null && ownerAddress == null) return null;

  // для выбора желаемого и set-wish-nft нужен идентификатор: id или address
  const stableId = id ?? address ?? ownerAddress;

  return { id: stableId, name, image, price, address, ownerAddress, collection, lottie };
}

