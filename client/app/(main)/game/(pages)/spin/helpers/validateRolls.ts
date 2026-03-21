/**
 * Валидирует количество бросков
 * @param rolls - количество бросков для проверки
 * @param minRolls - минимальное количество (по умолчанию 1)
 * @param maxRolls - максимальное количество (опционально)
 * @returns true если валидно, false если нет
 */
export const validateRolls = (
    rolls: number, 
    minRolls: number = 1, 
    maxRolls?: number
): boolean => {
    if (rolls < minRolls) return false;
    if (maxRolls !== undefined && rolls > maxRolls) return false;
    return true;
};

