import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileSpreadsheet, FileText, Download } from 'lucide-react';
import type { PriceType } from '../types/priceType';

interface PriceListModalProps {
    isOpen: boolean;
    onClose: () => void;
    priceTypes: PriceType[];
    onDownload: (priceTypeId: string, format: 'excel' | 'pdf') => void;
}

export default function PriceListModal({ isOpen, onClose, priceTypes, onDownload }: PriceListModalProps) {
    const { t } = useTranslation();
    const [selectedPriceType, setSelectedPriceType] = useState<string>(priceTypes[0]?.slug || 'standard');
    const [format, setFormat] = useState<'excel' | 'pdf'>('excel');

    if (!isOpen) return null;

    const handleDownload = () => {
        onDownload(selectedPriceType, format);
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
                    {/* Price Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('priceList.selectType', 'Select Price Type')}
                        </label>
                        <select
                            value={selectedPriceType}
                            onChange={(e) => setSelectedPriceType(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
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
