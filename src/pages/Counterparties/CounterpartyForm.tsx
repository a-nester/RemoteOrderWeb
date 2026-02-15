
import React, { useState, useEffect } from 'react';
import type { Counterparty, CounterpartyGroup } from '../../types/counterparty';
import type { PriceType } from '../../types/priceType';
import { PriceTypesService } from '../../services/priceTypes.service';

interface Props {
    counterparty?: Counterparty | null;
    groups: CounterpartyGroup[];
    onSave: (data: Partial<Counterparty>) => Promise<void>;
    onCancel: () => void;
}

export default function CounterpartyForm({ counterparty, groups, onSave, onCancel }: Props) {
    const [formData, setFormData] = useState<Partial<Counterparty>>({
        name: '',
        address: '',
        phone: '',
        contactPerson: '',
        isBuyer: false,
        isSeller: false,
        priceTypeId: '',
        groupId: ''
    });
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

    useEffect(() => {
        if (counterparty) {
            setFormData(counterparty);
        }
        loadPriceTypes();
    }, [counterparty]);

    const loadPriceTypes = async () => {
        try {
            const types = await PriceTypesService.fetchPriceTypes();
            setPriceTypes(types);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Sanitize: convert empty strings to null for optional foreign keys
        const payload = {
            ...formData,
            priceTypeId: formData.priceTypeId || null,
            groupId: formData.groupId || null
        };
        await onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
                <h2 className="text-xl font-bold mb-4 dark:text-white">
                    {counterparty ? 'Edit Counterparty' : 'New Counterparty'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                            <input
                                type="text"
                                value={formData.address || ''}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contactPerson || ''}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group</label>
                            <select
                                value={formData.groupId || ''}
                                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">No Group</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price Type</label>
                            <select
                                value={formData.priceTypeId || ''}
                                onChange={(e) => setFormData({ ...formData, priceTypeId: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">Select Price Type</option>
                                {priceTypes.map(pt => (
                                    <option key={pt.id} value={pt.id}>{pt.name} ({pt.currency})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.isBuyer}
                                onChange={(e) => setFormData({ ...formData, isBuyer: e.target.checked })}
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Buyer</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.isSeller}
                                onChange={(e) => setFormData({ ...formData, isSeller: e.target.checked })}
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Seller</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
