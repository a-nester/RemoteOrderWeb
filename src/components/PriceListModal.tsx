import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileSpreadsheet, FileText, Download, ChevronDown } from 'lucide-react';
import { CounterpartyService } from '../services/counterparty.service';
import { ClientPriceDocumentsService } from '../services/clientPriceDocuments.service';
import type { PriceType } from '../types/priceType';
import type { Counterparty } from '../types/counterparty';
import type { ActiveClientDiscount } from '../types/clientPriceDocument';

interface PriceListModalProps {
    isOpen: boolean;
    onClose: () => void;
    priceTypes: PriceType[];
    selectedCategories?: string[];
    onDownload: (
        priceTypeId: string,
        format: 'excel' | 'pdf',
        counterparty?: Counterparty | null,
        activeDiscounts?: Record<string, ActiveClientDiscount>
    ) => void;
}

export default function PriceListModal({ isOpen, onClose, priceTypes, selectedCategories, onDownload }: PriceListModalProps) {
    const { t } = useTranslation();
    const [selectedPriceType, setSelectedPriceType] = useState<string>(priceTypes[0]?.slug || 'standard');
    const [format, setFormat] = useState<'excel' | 'pdf'>('excel');

    // Counterparty selection state
    const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
    const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null);
    const [clientSearchText, setClientSearchText] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [activeDiscounts, setActiveDiscounts] = useState<Record<string, ActiveClientDiscount>>({});

    useEffect(() => {
        if (isOpen) {
            CounterpartyService.getAll()
                .then(data => setCounterparties(data))
                .catch(console.error);
        }
    }, [isOpen]);

    // When client is selected, auto-set their price type and fetch active discounts
    useEffect(() => {
        if (selectedCounterparty) {
            if (selectedCounterparty.priceTypeId) {
                const matchingPt = priceTypes.find(
                    pt => pt.id === selectedCounterparty.priceTypeId || pt.slug === selectedCounterparty.priceTypeId
                );
                if (matchingPt) {
                    setSelectedPriceType(matchingPt.slug);
                } else {
                    setSelectedPriceType(selectedCounterparty.priceTypeId);
                }
            } else {
                setSelectedPriceType('standard');
            }

            ClientPriceDocumentsService.fetchActiveDiscounts(selectedCounterparty.id)
                .then((discounts) => {
                    const map: Record<string, ActiveClientDiscount> = {};
                    (discounts || []).forEach((d) => {
                        if (d.productId && typeof d.discountPercent === 'number') {
                            const pIdStr = String(d.productId);
                            map[pIdStr] = d;
                            map[pIdStr.toLowerCase()] = d;
                        }
                    });
                    setActiveDiscounts(map);
                })
                .catch((err) => {
                    console.error('Failed to load active discounts for client in modal', err);
                    setActiveDiscounts({});
                });
        } else {
            setActiveDiscounts({});
        }
    }, [selectedCounterparty, priceTypes]);

    const filteredCounterparties = useMemo(() => {
        if (!clientSearchText.trim()) return counterparties;
        const lower = clientSearchText.toLowerCase();
        return counterparties.filter(c => 
            c.name.toLowerCase().includes(lower) || 
            (c.contactPerson && c.contactPerson.toLowerCase().includes(lower))
        );
    }, [counterparties, clientSearchText]);

    if (!isOpen) return null;

    const handleDownload = () => {
        onDownload(selectedPriceType, format, selectedCounterparty, activeDiscounts);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('priceList.download', 'Download Price List')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Active Categories Notice */}
                    {selectedCategories && selectedCategories.length > 0 && (
                        <div className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-1">
                            <span className="font-semibold block">Враховується фільтр категорій ({selectedCategories.length}):</span>
                            <span className="text-gray-600 dark:text-gray-300 line-clamp-2">{selectedCategories.join(', ')}</span>
                        </div>
                    )}

                    {/* Counterparty / Client Selector (Searchable Combobox) */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('priceList.selectClient', 'Клієнт (необов’язково)')}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={isClientDropdownOpen ? clientSearchText : (selectedCounterparty ? selectedCounterparty.name : clientSearchText)}
                                onChange={(e) => {
                                    setClientSearchText(e.target.value);
                                    if (!isClientDropdownOpen) setIsClientDropdownOpen(true);
                                    if (selectedCounterparty && e.target.value !== selectedCounterparty.name) {
                                        setSelectedCounterparty(null);
                                    }
                                }}
                                onFocus={() => {
                                    setIsClientDropdownOpen(true);
                                    if (selectedCounterparty) {
                                        setClientSearchText('');
                                    }
                                }}
                                placeholder="Введіть назву клієнта або виберіть зі списку..."
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 pl-3 pr-10 text-sm"
                            />
                            {selectedCounterparty ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCounterparty(null);
                                        setClientSearchText('');
                                    }}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X size={16} />
                                </button>
                            ) : (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                    <ChevronDown size={18} />
                                </div>
                            )}
                        </div>

                        {/* Dropdown menu */}
                        {isClientDropdownOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setIsClientDropdownOpen(false)} 
                                />
                                <ul className="absolute z-20 mt-1 w-full max-h-52 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 text-sm">
                                    <li
                                        onClick={() => {
                                            setSelectedCounterparty(null);
                                            setClientSearchText('');
                                            setIsClientDropdownOpen(false);
                                        }}
                                        className="px-3 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 italic"
                                    >
                                        -- Не вибрано --
                                    </li>
                                    {filteredCounterparties.map((cp) => (
                                        <li
                                            key={cp.id}
                                            onClick={() => {
                                                setSelectedCounterparty(cp);
                                                setClientSearchText(cp.name);
                                                setIsClientDropdownOpen(false);
                                            }}
                                            className={`px-3 py-2 cursor-pointer hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white ${
                                                selectedCounterparty?.id === cp.id ? 'bg-indigo-50 dark:bg-gray-700 font-semibold text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
                                            }`}
                                        >
                                            {cp.name}
                                        </li>
                                    ))}
                                    {filteredCounterparties.length === 0 && (
                                        <li className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                                            Клієнтів не знайдено
                                        </li>
                                    )}
                                </ul>
                            </>
                        )}
                    </div>

                    {/* Price Type Selector */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('priceList.selectType', 'Select Price Type')}
                            </label>
                            {selectedCounterparty && (
                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                    (ціну підтягнуто автоматично для клієнта)
                                </span>
                            )}
                        </div>
                        <select
                            value={selectedPriceType}
                            onChange={(e) => setSelectedPriceType(e.target.value)}
                            disabled={!!selectedCounterparty}
                            className={`w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3 ${
                                selectedCounterparty ? 'bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 cursor-not-allowed border-dashed' : ''
                            }`}
                        >
                            <option value="standard">{t('priceType.standard', 'Standard')}</option>
                            {priceTypes.map(pt => (
                                <option key={pt.id} value={pt.slug}>
                                    {pt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Format Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('priceList.selectFormat', 'Select Format')}
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setFormat('excel')}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                                    format === 'excel'
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                            >
                                <FileSpreadsheet className="w-8 h-8 mb-2" />
                                <span className="font-medium">Excel</span>
                            </button>
                            
                            <button
                                onClick={() => setFormat('pdf')}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                                    format === 'pdf'
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                            >
                                <FileText className="w-8 h-8 mb-2" />
                                <span className="font-medium">PDF</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {t('common.download', 'Download')}
                    </button>
                </div>
            </div>
        </div>
    );
}
