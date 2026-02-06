export function getModeByTon(totalTon: number): 'normal' | 'mystery' | 'multy' {
    if (totalTon > 50) {
        return 'mystery';
    }
    if (totalTon > 20) {
        return 'multy';
    }
    return 'normal';
}