export function numberToWordsUk(number: number): string {
    const units = ['', 'одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
    const teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'];
    const tens = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
    const hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];

    if (number === 0) return 'нуль';

    const integerPart = Math.floor(number);
    const fractionalPart = Math.round((number - integerPart) * 100);

    let num = integerPart;

    // Helper to fix 1/2 gender for generic numbers vs specific thousands
    // Actually, simple approach: split into groups of 3

    // Hardcoded simple implementation for max 999 999 999

    // Billions
    const billions = Math.floor(num / 1000000000);
    if (billions > 0) {
        // Needs "один", "два" for masculine
        // Refactor logic: pass gender to getGroupWord?
        // For now, let's assume standard integer logic, but fix for 1 and 2 if needed.
        // Actually, "один мільярд", "два мільярди".
        // "одна тисяча", "дві тисячі".
    }

    // Easier: Just handle 0-999 and combine.
    // Let's rewrite slightly for clarity and correctness with genders.

    const getPart = (n: number, gender: 'masc' | 'fem'): string => {
        let res = '';
        // Hundreds
        res += hundreds[Math.floor(n / 100)] + ' ';
        // Tens/Units
        const rem = n % 100;
        if (rem >= 10 && rem < 20) {
            res += teens[rem - 10] + ' ';
        } else {
            res += tens[Math.floor(rem / 10)] + ' ';
            const u = rem % 10;
            if (u === 1) res += (gender === 'fem' ? 'одна ' : 'один ');
            else if (u === 2) res += (gender === 'fem' ? 'дві ' : 'два ');
            else if (u === 3) res += 'три ';
            else if (u === 4) res += 'чотири ';
            else if (u > 0) res += units[u] + ' '; // 5-9 same
        }
        return res;
    };

    let result = '';

    // Billions (masc)
    const b = Math.floor(num / 1000000000);
    num %= 1000000000;
    if (b > 0) {
        result += getPart(b, 'masc');
        const rem = b % 100;
        if (rem % 10 === 1 && rem !== 11) result += 'мільярд ';
        else if (rem % 10 >= 2 && rem % 10 <= 4 && (rem < 10 || rem > 20)) result += 'мільярди ';
        else result += 'мільярдів ';
    }

    // Millions (masc)
    const m = Math.floor(num / 1000000);
    num %= 1000000;
    if (m > 0) {
        result += getPart(m, 'masc');
        const rem = m % 100;
        if (rem % 10 === 1 && rem !== 11) result += 'мільйон ';
        else if (rem % 10 >= 2 && rem % 10 <= 4 && (rem < 10 || rem > 20)) result += 'мільйони ';
        else result += 'мільйонів ';
    }

    // Thousands (fem)
    const t = Math.floor(num / 1000);
    num %= 1000;
    if (t > 0) {
        result += getPart(t, 'fem');
        const rem = t % 100;
        if (rem % 10 === 1 && rem !== 11) result += 'тисяча ';
        else if (rem % 10 >= 2 && rem % 10 <= 4 && (rem < 10 || rem > 20)) result += 'тисячі ';
        else result += 'тисяч ';
    }

    // Currency (Grivna - fem)
    if (num > 0) {
        result += getPart(num, 'fem');
    } else if (result === '') {
        // Zero whole currency? Maybe not say anything or say "нуль"?
        // Usually "Нуль гривень"
    }

    // Add currency name
    const rem = integerPart % 100;
    if (rem % 10 === 1 && rem !== 11) result += 'гривня ';
    else if (rem % 10 >= 2 && rem % 10 <= 4 && (rem < 10 || rem > 20)) result += 'гривні ';
    else result += 'гривень ';

    // Kopeks
    result += `${fractionalPart} `;
    const krem = fractionalPart % 100;
    if (krem % 10 === 1 && krem !== 11) result += 'копійка';
    else if (krem % 10 >= 2 && krem % 10 <= 4 && (krem < 10 || krem > 20)) result += 'копійки';
    else result += 'копійок';

    // Capitalize first letter
    if (result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    return result.trim();
}
