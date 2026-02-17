export function numberToWordsUk(number: number): string {
    const units = ['', 'одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
    const teens = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'];
    const tens = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
    const hundreds = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];

    const getGroupWord = (n: number, index: number): string => {
        if (n === 0) return '';

        let word = '';

        // Hundreds
        word += hundreds[Math.floor(n / 100)] + ' ';

        // Tens and Units
        const remainder = n % 100;
        if (remainder >= 10 && remainder < 20) {
            word += teens[remainder - 10] + ' ';
        } else {
            word += tens[Math.floor(remainder / 10)] + ' ';
            // Handle gender for 1 and 2
            const unit = remainder % 10;
            if (unit === 1) {
                if (index === 1) word += 'одна '; // тисяча (fem)
                else if (index === 0) word += 'одна '; // гривня (fem) - WAIT, гривня is feminine? Yes. But wait, logic is tricky.
                // Let's simplify: 
                // Thousands (index 1): 1 -> одна, 2 -> дві
                // Millions (index 2): 1 -> один, 2 -> два
                // Billions (index 3): 1 -> один, 2 -> два
                // Grievnas (index 0 - implicitly): 1 -> одна, 2 -> дві? No, гривня is feminine.
                // 1 грн -> одна
                // 2 грн -> дві
                // 21 грн -> двадцять одна
                // 22 грн -> двадцять дві
            } else if (unit === 2) {
                if (index === 1) word += 'дві '; // тисяча (fem)
                else if (index === 0) word += 'дві '; // гривня (fem)
            } else {
                if (unit > 0) word += units[unit] + ' ';
            }
        }

        // Add group name
        switch (index) {
            case 3: // Billions
                // 1 мільярд, 2-4 мільярди, 5+ мільярдів
                if (remainder % 10 === 1 && remainder !== 11) word += 'мільярд ';
                else if (remainder % 10 >= 2 && remainder % 10 <= 4 && (remainder < 10 || remainder > 20)) word += 'мільярди ';
                else word += 'мільярдів ';
                break;
            case 2: // Millions
                // 1 мільйон, 2-4 мільйони, 5+ мільйонів
                if (remainder % 10 === 1 && remainder !== 11) word += 'мільйон ';
                else if (remainder % 10 >= 2 && remainder % 10 <= 4 && (remainder < 10 || remainder > 20)) word += 'мільйони ';
                else word += 'мільйонів ';
                break;
            case 1: // Thousands
                // 1 тисяча, 2-4 тисячі, 5+ тисяч
                if (remainder % 10 === 1 && remainder !== 11) word += 'тисяча ';
                else if (remainder % 10 >= 2 && remainder % 10 <= 4 && (remainder < 10 || remainder > 20)) word += 'тисячі ';
                else word += 'тисяч ';
                break;
            case 0: // Base (Grivnas) - handled outside or just generic number? 
                // Creating generic number converter first.
                break;
        }

        return word;
    }

    if (number === 0) return 'нуль';

    const integerPart = Math.floor(number);
    const fractionalPart = Math.round((number - integerPart) * 100);

    let words = '';
    let num = integerPart;
    let groupIndex = 0;

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
