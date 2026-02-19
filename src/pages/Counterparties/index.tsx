
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Counterparty, CounterpartyGroup } from '../../types/counterparty';
import { CounterpartyService } from '../../services/counterparty.service';
import CounterpartyForm from './CounterpartyForm';
import { Plus, UserPlus, Folder, ArrowLeft } from 'lucide-react';

export default function Counterparties() {
    const { t } = useTranslation();
    const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
    const [groups, setGroups] = useState<CounterpartyGroup[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Navigation State
    const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

    // UI State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCounterparty, setEditingCounterparty] = useState<Counterparty | null>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [cpData, groupData] = await Promise.all([
                CounterpartyService.getAll(),
                CounterpartyService.getGroups()
            ]);
            setCounterparties(cpData);
            setGroups(groupData);
        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCounterparty = () => {
        setEditingCounterparty(null);
        setIsFormOpen(true);
    };

    const handleEditCounterparty = (cp: Counterparty) => {
        setEditingCounterparty(cp);
        setIsFormOpen(true);
    };

    const handleSaveCounterparty = async (data: Partial<Counterparty>) => {
        try {
            if (editingCounterparty) {
                await CounterpartyService.update(editingCounterparty.id, data);
            } else {
                await CounterpartyService.create(data);
            }
            setIsFormOpen(false);
            loadData();
        } catch (error) {
            console.error("Failed to save counterparty", error);
            alert("Failed to save counterparty");
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await CounterpartyService.createGroup(newGroupName);
            setNewGroupName('');
            setIsGroupModalOpen(false);
            loadData();
        } catch (error) {
            console.error("Failed to create group", error);
        }
    };

    const filteredCounterparties = counterparties.filter(cp => 
        currentGroupId ? cp.groupId === currentGroupId : !cp.groupId
    );

    const currentGroup = currentGroupId ? groups.find(g => g.id === currentGroupId) : null;

    if (loading) return <div>{t('common.loading')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 shadow rounded-lg sticky top-0 z-10 dark:bg-gray-800">
                <div className="flex items-center gap-4">
                    {currentGroupId && (
                        <button 
                            onClick={() => setCurrentGroupId(null)}
                            className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700"
                        >
                            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentGroupId ? currentGroup?.name : t('menu.counterparties', 'Counterparties')}
                    </h1>
                </div>
                <div className="flex gap-2">
                    {!currentGroupId && (
                         <button
                            onClick={() => setIsGroupModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                        >
                            <Plus size={18} />
                            {t('common.add')} {t('menu.groups', 'Group')}
                        </button>
                    )}
                    <button
                        onClick={handleCreateCounterparty}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        <UserPlus size={18} />
                        {t('common.add')} {t('menu.counterparties', 'Counterparty')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {/* Render Groups (Folders) only at root level */}
                        {!currentGroupId && groups.map(group => (
                            <tr 
                                key={`group-${group.id}`} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                onClick={() => setCurrentGroupId(group.id)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Folder className="h-5 w-5 text-yellow-500 mr-3" />
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</div>
                                    </div>
                                </td>
                                <td colSpan={4}></td>
                            </tr>
                        ))}

                        {/* Render Counterparties */}
                        {filteredCounterparties.map((cp) => (
                            <tr key={cp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{cp.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{cp.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex gap-1">
                                        {cp.isBuyer && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Buyer</span>}
                                        {cp.isSeller && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Seller</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {cp.priceTypeName || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {cp.contactPerson || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditCounterparty(cp);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                                    >
                                        {t('common.edit')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isFormOpen && (
                <CounterpartyForm
                    counterparty={editingCounterparty}
                    groups={groups}
                    onSave={handleSaveCounterparty}
                    onCancel={() => setIsFormOpen(false)}
                />
            )}

            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">New Group</h2>
                        <form onSubmit={handleCreateGroup}>
                            <input
                                type="text"
                                placeholder="Group Name"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
                                required
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsGroupModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
