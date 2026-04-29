import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductsStore } from '../store/products.store';

export default function PriceListPrint() {
    const [searchParams] = useSearchParams();
    const priceTypeId = searchParams.get('priceType') || 'standard';
    
    const { products, loadProducts } = useProductsStore();
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const init = async () => {
            await loadProducts();
            setLoaded(true);
        };
        init();
    }, [loadProducts]);

    useEffect(() => {
        if (loaded) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loaded]);

    if (!loaded) return <div className="p-10 text-center">Завантаження...</div>;

    const date = new Date().toLocaleDateString('uk-UA');
    
    // Sort products if necessary (e.g. by category or name)
    const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="bg-white p-6 max-w-5xl mx-auto text-black font-sans text-sm">
            {/* Header Information */}
            <div className="mb-4">
                <div>Контактна інформація:</div>
                <div>ПП «СМАКОСИР» Рівненська обл., Дубенський р-н, с. Пасіки, вул. Берестецька, 2 б.</div>
                <div className="font-bold mt-2">Відділ продажу: моб. 097 7788277</div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black">
                <thead>
                    <tr>
                        <th colSpan={7} className="bg-yellow-300 border border-black p-2 text-left font-bold text-lg uppercase">
                            ПРАЙС-ЛИСТ на {date} р.
                        </th>
                    </tr>
                    <tr className="bg-white">
                        <th className="border border-black p-2 text-center w-8">№</th>
                        <th className="border border-black p-2 text-center">Назва продукції</th>
                        <th className="border border-black p-2 text-center w-24">Штрих-код</th>
                        <th className="border border-black p-2 text-center w-24">Пакування<br/>одиниці</th>
                        <th className="border border-black p-2 text-center w-24">Тара</th>
                        <th className="border border-black p-2 text-center w-20">Вага<br/>нетто в<br/>тарі</th>
                        <th className="border border-black p-2 text-center w-24">Ціна,<br/>грн/кг/шт<br/>без ПДВ</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedProducts.map((p, index) => {
                        const inBoxText = p.inBox ? `${p.inBox} ${p.unit || 'шт'}` : '';
                        const price = (p.prices?.[priceTypeId] || 0).toFixed(2);
                        const isYellow = p.category && p.category.toLowerCase().includes('сир твердий');

                        return (
                            <tr key={p.id} className={isYellow ? 'bg-yellow-300' : 'bg-white'}>
                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                <td className="border border-black p-1 text-left font-medium">{p.name}</td>
                                <td className="border border-black p-1 text-center">{p.barcode || ''}</td>
                                <td className="border border-black p-1 text-center">{p.packing || ''}</td>
                                <td className="border border-black p-1 text-center">{p.tara || ''}</td>
                                <td className="border border-black p-1 text-center">{inBoxText}</td>
                                <td className="border border-black p-1 text-center font-bold">{price}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            
            {/* Screen-only back button */}
            <div className="mt-8 print:hidden text-center">
                <button 
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                    Повернутися назад
                </button>
            </div>
        </div>
    );
}
