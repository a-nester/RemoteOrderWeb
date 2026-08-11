import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductsStore } from '../store/products.store';
import { OrganizationService } from '../services/organization.service';
import { PriceTypesService } from '../services/priceTypes.service';
import type { Organization } from '../types/organization';
import type { PriceType } from '../types/priceType';
import type { Product } from '../types/product';

export default function PriceListPrint() {
    const [searchParams] = useSearchParams();
    const priceTypeId = searchParams.get('priceType') || 'standard';
    
    const { products, loadProducts } = useProductsStore();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                loadProducts().catch(console.error),
                OrganizationService.getOrganization().then(setOrganization).catch(console.error),
                PriceTypesService.fetchPriceTypes().then(setPriceTypes).catch(console.error)
            ]);
            setLoaded(true);
        };
        init();
    }, [loadProducts]);

    useEffect(() => {
        if (loaded) {
            const timer = setTimeout(() => {
                window.print();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [loaded]);

    const allowedCategories = organization?.categories;

    const priceTypeName = useMemo(() => {
        if (priceTypeId === 'standard') return 'Standard Price';
        const found = priceTypes.find(pt => pt.slug === priceTypeId || pt.id === priceTypeId);
        return found ? found.name : priceTypeId;
    }, [priceTypeId, priceTypes]);

    // Group products by category
    const groupedProducts = useMemo(() => {
        let filtered = products;
        if (Array.isArray(allowedCategories) && allowedCategories.length > 0) {
            filtered = products.filter(p => !p.category || allowedCategories.includes(p.category));
        }

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

        return sortedCategories.map(cat => ({
            category: cat,
            items: groups[cat].sort((a, b) => a.name.localeCompare(b.name))
        }));
    }, [products, allowedCategories]);

    if (!loaded) return <div className="p-10 text-center text-gray-500">Підготовка прайс-листа до друку...</div>;

    const date = new Date().toLocaleDateString('uk-UA');
    let globalIndex = 1;

    return (
        <div className="bg-white p-6 max-w-5xl mx-auto text-black font-sans text-xs sm:text-sm">
            {/* Header Information */}
            <div className="mb-4">
                <div className="font-semibold text-gray-700">Контактна інформація:</div>
                <div className="text-gray-900 font-medium">
                    {organization?.name || 'ПП «СМАКОСИР»'} {organization?.fullDetails || 'Рівненська обл., Дубенський р-н, с. Пасіки, вул. Берестецька, 2 б.'}
                </div>
                <div className="font-bold mt-1 text-indigo-900">Відділ продажу: моб. 097 7788277</div>
            </div>

            {/* Title Banner */}
            <div className="bg-yellow-300 border border-black p-2.5 text-center font-bold text-base uppercase mb-2 shadow-sm">
                ПРАЙС-ЛИСТ ({priceTypeName}) на {date} р.
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black">
                <thead>
                    <tr className="bg-gray-100 font-bold">
                        <th className="border border-black p-1.5 text-center w-8">№</th>
                        <th className="border border-black p-1.5 text-center">Назва продукції</th>
                        <th className="border border-black p-1.5 text-center w-24">Штрих-код</th>
                        <th className="border border-black p-1.5 text-center w-24">Пакування одиниці</th>
                        <th className="border border-black p-1.5 text-center w-24">Тара</th>
                        <th className="border border-black p-1.5 text-center w-20">Вага нетто в тарі</th>
                        <th className="border border-black p-1.5 text-center w-24">Ціна, грн/кг/шт без ПДВ</th>
                    </tr>
                </thead>
                <tbody>
                    {groupedProducts.map((group) => (
                        <React.Fragment key={group.category}>
                            {/* Category Header Row */}
                            <tr className="bg-gray-200/80 font-bold">
                                <td colSpan={7} className="border border-black px-2 py-1 text-left text-xs uppercase tracking-wider bg-gray-200">
                                    📁 {group.category}
                                </td>
                            </tr>
                            {/* Products in Category */}
                            {group.items.map((p) => {
                                const inBoxText = p.inBox ? `${p.inBox} ${p.unit || 'шт'}` : '';
                                const rawPrice = p.prices?.[priceTypeId] ?? 0;
                                const priceStr = Number(rawPrice).toFixed(2);
                                const isHighlighted = p.category && p.category.toLowerCase().includes('сир твердий');

                                return (
                                    <tr key={p.id} className={isHighlighted ? 'bg-yellow-100' : 'bg-white hover:bg-gray-50'}>
                                        <td className="border border-black p-1 text-center font-medium">{globalIndex++}</td>
                                        <td className="border border-black p-1 text-left font-medium">{p.name}</td>
                                        <td className="border border-black p-1 text-center text-gray-700">{p.barcode || ''}</td>
                                        <td className="border border-black p-1 text-center text-gray-700">{p.packing || ''}</td>
                                        <td className="border border-black p-1 text-center text-gray-700">{p.tara || ''}</td>
                                        <td className="border border-black p-1 text-center text-gray-700">{inBoxText}</td>
                                        <td className="border border-black p-1 text-center font-bold">{priceStr} ₴</td>
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
            
            {/* Screen-only back button */}
            <div className="mt-8 print:hidden text-center">
                <button 
                    onClick={() => window.history.back()}
                    className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow hover:bg-indigo-700 transition-colors"
                >
                    Повернутися назад
                </button>
            </div>
        </div>
    );
}
