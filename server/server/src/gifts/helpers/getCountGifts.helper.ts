

export const getCountGifts = (amount:number) => {
    return Math.max(Math.min(3, amount), 10);
}