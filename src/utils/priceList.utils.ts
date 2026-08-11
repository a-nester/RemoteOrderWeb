import * as XLSX from 'xlsx-js-style';
import type { Product } from '../types/product';

export const generateExcelPriceList = (
  products: Product[],
  priceType: string,
  priceTypeName: string,
  allowedCategories?: string[]
) => {
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

  const categoryHeaderStyle = {
    font: { bold: true, sz: 11, name: 'Arial' },
    fill: { fgColor: { rgb: "F0F0F0" } }, // Light Gray
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

  // Filter products by allowed categories if provided
  let filtered = products;
  if (Array.isArray(allowedCategories) && allowedCategories.length > 0) {
    filtered = products.filter(p => !p.category || allowedCategories.includes(p.category));
  }

  // Group products by category
  const groups: Record<string, Product[]> = {};
  filtered.forEach((p) => {
    const cat = p.category || "Без категорії";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  const sortedCategories = Object.keys(groups).sort((a, b) => {
    if (Array.isArray(allowedCategories) && allowedCategories.length > 0) {
      const idxA = allowedCategories.indexOf(a);
      const idxB = allowedCategories.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return a.localeCompare(b);
  });

  // Create Data Array
  const sheetData: any[][] = [
    [{ v: 'Контактна інформація:', s: textStyle }],
    [{ v: 'ПП «СМАКОСИР» Рівненська обл., Дубенський р-н, с. Пасіки, вул. Берестецька, 2 б.', s: textStyle }],
    [{ v: 'Відділ продажу: моб. 097 7788277', s: { font: { bold: true, sz: 10, name: 'Arial' } } }],
    [], // Empty row
    // Row 5: Yellow Title
    [
      { v: `ПРАЙС-ЛИСТ (${priceTypeName}) на ${date} р.`, s: titleRowStyle },
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

  const merges: any[] = [{ s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }];
  let itemIndex = 1;

  sortedCategories.forEach((cat) => {
    const items = groups[cat].sort((a, b) => a.name.localeCompare(b.name));
    
    // Add Category Header Row
    const catRowIndex = sheetData.length;
    sheetData.push([
      { v: cat, s: categoryHeaderStyle },
      { v: '', s: categoryHeaderStyle },
      { v: '', s: categoryHeaderStyle },
      { v: '', s: categoryHeaderStyle },
      { v: '', s: categoryHeaderStyle },
      { v: '', s: categoryHeaderStyle },
      { v: '', s: categoryHeaderStyle }
    ]);
    merges.push({ s: { r: catRowIndex, c: 0 }, e: { r: catRowIndex, c: 6 } });

    items.forEach((p) => {
      const inBoxText = p.inBox ? `${p.inBox} ${p.unit || 'шт'}` : '';
      const rawPrice = p.prices?.[priceType] ?? 0;
      const priceStr = Number(rawPrice).toFixed(2);

      sheetData.push([
        { v: itemIndex++, s: cellStyleCenter },
        { v: p.name, s: cellStyleLeft },
        { v: p.barcode || '', s: cellStyleCenter },
        { v: p.packing || '', s: cellStyleCenter },
        { v: p.tara || '', s: cellStyleCenter },
        { v: inBoxText, s: cellStyleCenter },
        { v: priceStr, s: cellStyleCenter }
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 5 },   // №
    { wch: 45 },  // Назва
    { wch: 15 },  // Штрих-код
    { wch: 12 },  // Пакування
    { wch: 12 },  // Тара
    { wch: 10 },  // Вага
    { wch: 12 }   // Ціна
  ];

  if (!ws['!rows']) ws['!rows'] = [];
  ws['!rows'][5] = { hpt: 40 }; // Header row height

  XLSX.utils.book_append_sheet(wb, ws, "Price List");

  // Browser Blob download to avoid Node fs errors
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileNameDate = new Date().toISOString().split('T')[0];
  link.download = `PriceList_${priceTypeName}_${fileNameDate}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
