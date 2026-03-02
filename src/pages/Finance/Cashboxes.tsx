import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FinanceService } from "../../services/finance.service";
import type {
  Cashbox,
  TransactionCategory,
} from "../../services/finance.service";
import { Plus, Edit2, Wallet, Tags, Loader2 } from "lucide-react";

export default function FinanceSettings() {
  const { t } = useTranslation();
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Cashbox Form
  const [cbForm, setCbForm] = useState<{
    id?: string;
    name: string;
    type: Cashbox["type"];
    currency: string;
    isOpen: boolean;
  }>({
    name: "",
    type: "CASH",
    currency: "UAH",
    isOpen: false,
  });

  // Category Form
  const [catForm, setCatForm] = useState<{
    id?: string;
    name: string;
    type: TransactionCategory["type"];
    isOpen: boolean;
  }>({
    name: "",
    type: "OUTCOME",
    isOpen: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cbRes, catRes] = await Promise.all([
        FinanceService.getCashboxes(),
        FinanceService.getCategories(),
      ]);
      setCashboxes(cbRes);
      setCategories(catRes);
    } catch (error) {
      console.error("Error fetching finance settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCashbox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (cbForm.id) {
        await FinanceService.updateCashbox(cbForm.id, cbForm);
      } else {
        await FinanceService.createCashbox(cbForm);
      }
      setCbForm({ name: "", type: "CASH", currency: "UAH", isOpen: false });
      fetchData();
    } catch (error) {
      console.error("Error saving cashbox:", error);
      alert("Помилка збереження каси");
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        await FinanceService.updateCategory(catForm.id, catForm);
      } else {
        await FinanceService.createCategory(catForm);
      }
      setCatForm({ name: "", type: "OUTCOME", isOpen: false });
      fetchData();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Помилка збереження статті");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Налаштування фінансів
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashboxes Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-500" />
              Каси та Рахунки
            </h2>
            <button
              onClick={() =>
                setCbForm({
                  name: "",
                  type: "CASH",
                  currency: "UAH",
                  isOpen: true,
                })
              }
              className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Додати
            </button>
          </div>

          {cbForm.isOpen && (
            <form
              onSubmit={handleSaveCashbox}
              className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Назва
                </label>
                <input
                  type="text"
                  required
                  value={cbForm.name}
                  onChange={(e) =>
                    setCbForm({ ...cbForm, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Тип
                </label>
                <select
                  value={cbForm.type}
                  onChange={(e) =>
                    setCbForm({ ...cbForm, type: e.target.value as any })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="CASH">Готівка</option>
                  <option value="BANK_ACCOUNT">Банківський рахунок</option>
                  <option value="MANAGER">Каса менеджера</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCbForm({ ...cbForm, isOpen: false })}
                  className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                >
                  {t("common.cancel", "Скасувати")}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  {t("common.save", "Зберегти")}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {cashboxes.map((cb) => (
              <div
                key={cb.id}
                className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {cb.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {cb.type === "CASH"
                      ? "Готівка"
                      : cb.type === "BANK_ACCOUNT"
                        ? "Банківський рахунок"
                        : "Каса менеджера"}{" "}
                    • {cb.currency}
                  </div>
                </div>
                <button
                  onClick={() => setCbForm({ ...cb, isOpen: true })}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {cashboxes.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                Немає кас
              </div>
            )}
          </div>
        </div>

        {/* Categories Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Tags className="h-5 w-5 text-emerald-500" />
              Статті руху коштів
            </h2>
            <button
              onClick={() =>
                setCatForm({ name: "", type: "OUTCOME", isOpen: true })
              }
              className="flex items-center px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Додати
            </button>
          </div>

          {catForm.isOpen && (
            <form
              onSubmit={handleSaveCategory}
              className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Назва
                </label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({ ...catForm, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Тип
                </label>
                <select
                  value={catForm.type}
                  onChange={(e) =>
                    setCatForm({ ...catForm, type: e.target.value as any })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="INCOME">Надходження (Дохід)</option>
                  <option value="OUTCOME">Виплата (Витрата)</option>
                  <option value="BOTH">Універсальна</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCatForm({ ...catForm, isOpen: false })}
                  className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                >
                  {t("common.cancel", "Скасувати")}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  {t("common.save", "Зберегти")}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex justify-between items-center p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {cat.name}
                  </div>
                  <div
                    className={`text-xs ${cat.type === "INCOME" ? "text-green-500" : cat.type === "OUTCOME" ? "text-red-500" : "text-blue-500"}`}
                  >
                    {cat.type === "INCOME"
                      ? "Надходження"
                      : cat.type === "OUTCOME"
                        ? "Витрата"
                        : "Універсальна"}
                  </div>
                </div>
                <button
                  onClick={() => setCatForm({ ...cat, isOpen: true })}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                Немає статей
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
