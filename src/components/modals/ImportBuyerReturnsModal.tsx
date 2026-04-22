import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, FileDown } from "lucide-react";
import { buyerReturnService } from "../../services/buyerReturnService";
import type { BuyerReturn, BuyerReturnItem } from "../../services/buyerReturnService";

interface ImportBuyerReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: BuyerReturnItem[]) => void;
}

export default function ImportBuyerReturnsModal({
  isOpen,
  onClose,
  onImport,
}: ImportBuyerReturnsModalProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<BuyerReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      setSelectedIds(new Set());
      setSearchTerm("");
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      // Load all POSTED buyer returns (last 30 days is a good default filter to prevent overhead, but for simplicity let's load all and filter by POSTED)
      const data = await buyerReturnService.getAll();
      const postedDocs = data.filter((doc) => doc.status === "POSTED");
      // Sort by date descending
      postedDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDocuments(postedDocs);
    } catch (error) {
      console.error("Failed to load buyer returns:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = (filteredDocs: BuyerReturn[]) => {
    if (selectedIds.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map((doc) => doc.id)));
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    setLoading(true);
    try {
      // Fetch details to get items
      const selectedDocsDetails = await Promise.all(
        Array.from(selectedIds).map((id) => buyerReturnService.getById(id))
      );

      const allItems: BuyerReturnItem[] = [];
      selectedDocsDetails.forEach((doc) => {
        if (doc.items && Array.isArray(doc.items)) {
          allItems.push(...doc.items);
        }
      });

      onImport(allItems);
      onClose();
    } catch (error) {
      console.error("Failed to load items for selected document", error);
      alert(t("common.error", "Сталася помилка при завантаженні товарів"));
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const searchLow = searchTerm.toLowerCase();
    return (
      doc.number.toLowerCase().includes(searchLow) ||
      (doc.counterpartyName || "").toLowerCase().includes(searchLow) ||
      (doc.warehouseName || "").toLowerCase().includes(searchLow) ||
      (doc.comment || "").toLowerCase().includes(searchLow)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center">
                <FileDown size={24} className="mr-2 text-indigo-500" />
                {t("action.importBuyerReturns", "Імпорт з повернень покупців")}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors rounded-full p-1"
              >
                <X size={24} />
              </button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("common.search", "Пошук...")}
                className="pl-10 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Виберіть документи, з яких потрібно імпортувати список повернутих товарів. Однакові товари будуть автоматично згруповані і їх кількість буде плюсуватись.
            </p>
          </div>

          <div className="px-4 py-2 max-h-[50vh] overflow-y-auto">
            {loading && documents.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Завантаження списку документів...
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? "Не знайдено документів, що відповідають пошуку" : "Немає проведених повернень від покупців"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                          onChange={() => selectAll(filteredDocuments)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        />
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        № та Дата
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Клієнт
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Сума
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredDocuments.map((doc) => (
                      <tr 
                        key={doc.id} 
                        className={"hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer " + (selectedIds.has(doc.id) ? "bg-indigo-50 dark:bg-indigo-900/20" : "")}
                        onClick={() => toggleSelection(doc.id)}
                      >
                        <td className="px-3 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(doc.id)}
                            onChange={() => toggleSelection(doc.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            №{doc.number}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(doc.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {doc.counterpartyName}
                          </div>
                          {doc.warehouseName && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.warehouseName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {Number(doc.totalAmount).toLocaleString()} ₴
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedIds.size === 0 || loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 flex items-center"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              {t("action.import", "Імпортувати")} ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm focus:outline-none"
            >
              {t("common.cancel", "Cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
