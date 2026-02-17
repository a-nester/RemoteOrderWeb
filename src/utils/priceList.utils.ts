import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Product } from '../types/product';

export const generateExcelPriceList = (products: Product[], priceType: string, priceTypeName: string, currency: string) => {
    // 1. Prepare data
    const data = products.map(p => ({
        'Name': p.name,
        'Category': p.category,
        'Unit': p.unit,
        [`Price (${priceTypeName})`]: p.prices?.[priceType] || 0,
        'Currency': currency
    }));

    // 2. Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // 3. Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Price List");

    // 4. Generate file
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `PriceList_${priceTypeName}_${date}.xlsx`);
};

export const generatePdfPriceList = (products: Product[], priceType: string, priceTypeName: string, currency: string) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(`Price List: ${priceTypeName}`, 14, 22);

    // Date
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

    // Filter and map data
    const tableData = products.map(p => [
        p.name,
        p.category,
        p.unit,
        (p.prices?.[priceType] || 0).toFixed(2) + ' ' + currency
    ]);

    // Generate table
    autoTable(doc, {
        head: [['Name', 'Category', 'Unit', 'Price']],
        body: tableData,
        startY: 35,
    });

    const date = new Date().toISOString().split('T')[0];
    doc.save(`PriceList_${priceTypeName}_${date}.pdf`);
};
