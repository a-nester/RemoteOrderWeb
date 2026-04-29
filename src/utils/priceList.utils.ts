import * as XLSX from 'xlsx-js-style';
import type { Product } from '../types/product';

export const generateExcelPriceList = (products: Product[], priceType: string, priceTypeName: string) => {
    const wb = XLSX.utils.book_new();

    const date = new Date().toLocaleDateString('uk-UA');
    
    // Define Styles
    const borderAll = {
        top: { style: 'thin', color: { rgb: "000000" } },
        bottom: { style: 'thin', color: { rgb: "000000" } },
        left: { style: 'thin', color: { rgb: "000000" } },
        right: { style: 'thin', color: { rgb: "000000" } }
    };

    const headerStyle = {
        font: { bold: true, sz: 10, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderAll
    };

    const titleRowStyle = {
        font: { bold: true, sz: 12, name: 'Arial' },
        fill: { fgColor: { rgb: "FFFF00" } }, // Yellow
        border: borderAll
    };

    const textStyle: any = {
        font: { sz: 10, name: 'Arial' }
    };

    const cellStyleCenter: any = {
        font: { sz: 10, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderAll
    };

    const cellStyleLeft: any = {
        font: { sz: 10, name: 'Arial' },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: borderAll
    };

    // Create Data Array
    const sheetData: any[][] = [
        [{ v: 'Контактна інформація:', s: textStyle }],
        [{ v: 'ПП «СМАКОСИР» Рівненська обл., Дубенський р-н, с. Пасіки, вул. Берестецька, 2 б.', s: textStyle }],
        [{ v: 'Відділ продажу: моб. 097 7788277', s: { font: { bold: true, sz: 10, name: 'Arial' } } }],
        [], // Empty row
        // Row 5: Yellow Title
        [
            { v: `ПРАЙС-ЛИСТ на ${date} р.`, s: titleRowStyle },
            { v: '', s: titleRowStyle },
            { v: '', s: titleRowStyle },
            { v: '', s: titleRowStyle },
            { v: '', s: titleRowStyle },
            { v: '', s: titleRowStyle },
            { v: '', s: titleRowStyle }
        ],
        // Row 6: Columns
        [
            { v: '№', s: headerStyle },
            { v: 'Назва продукції', s: headerStyle },
            { v: 'Штрих-код', s: headerStyle },
            { v: 'Пакування\nодиниці', s: headerStyle },
            { v: 'Тара', s: headerStyle },
            { v: 'Вага\nнетто в\nтарі', s: headerStyle },
            { v: 'Ціна,\nгрн/кг/шт\nбез ПДВ', s: headerStyle }
        ]
    ];

    // Add Products
    products.forEach((p, index) => {
        const inBoxText = p.inBox ? `${p.inBox} ${p.unit || 'шт'}` : '';
        const price = (p.prices?.[priceType] || 0).toFixed(2);

        // Add special yellow row for certain categories if requested, but for now standard rows
        // (If we want to mimic the image's yellow rows for 'Сир твердий', we could add logic here)
        let rowStyleCenter = cellStyleCenter;
        let rowStyleLeft = cellStyleLeft;
        
        if (p.category && p.category.toLowerCase().includes('сир твердий')) {
            rowStyleCenter = { ...cellStyleCenter, fill: { fgColor: { rgb: "FFFF00" } } };
            rowStyleLeft = { ...cellStyleLeft, fill: { fgColor: { rgb: "FFFF00" } } };
        }

        sheetData.push([
            { v: index + 1, s: rowStyleCenter },
            { v: p.name, s: rowStyleLeft },
            { v: p.barcode || '', s: rowStyleCenter }, // Barcode
            { v: p.packing || '', s: rowStyleCenter }, // Packing
            { v: p.tara || '', s: rowStyleCenter }, // Tara
            { v: inBoxText, s: rowStyleCenter },
            { v: price, s: rowStyleCenter }
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge cells for the Yellow Title row
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }); // Merge row 5 cols A-G

    // Column widths
    ws['!cols'] = [
        { wch: 5 },   // №
        { wch: 45 },  // Назва
        { wch: 15 },  // Штрих-код
        { wch: 12 },  // Пакування
        { wch: 12 },  // Тара
        { wch: 10 },  // Вага
        { wch: 12 }   // Ціна
    ];

    // Row heights for header
    if (!ws['!rows']) ws['!rows'] = [];
    ws['!rows'][5] = { hpt: 40 }; // Taller header row

    XLSX.utils.book_append_sheet(wb, ws, "Price List");

    const fileNameDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `PriceList_${priceTypeName}_${fileNameDate}.xlsx`);
};
