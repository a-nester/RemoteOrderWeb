import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FinanceService } from "../../services/finance.service";
import type {
  CashTransaction,
  Cashbox,
  TransactionCategory,
} from "../../services/finance.service";
import { CounterpartyService } from "../../services/counterparty.service";
import type { Counterparty } from "../../types/counterparty";
import {
  Plus,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Loader2,
} from "lucide-react";

export default function CashTransactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState<{
    date: string;
    type: "INCOME" | "OUTCOME";
    cashboxId: string;
    amount: string;
    categoryId: string;
    counterpartyId: string;
    comment: string;
  }>({
    date: new Date().toISOString().slice(0, 16),
    type: "INCOME",
    cashboxId: "",
    amount: "",
    categoryId: "",
    counterpartyId: "",
    comment: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, cbRes, catRes, cpRes] = await Promise.all([
        FinanceService.getTransactions(),
        FinanceService.getCashboxes(),
        FinanceService.getCategories(),
        CounterpartyService.getAll(),
      ]);
      setTransactions(txRes);
      setCashboxes(cbRes);
      setCategories(catRes);
      setCounterparties(cpRes);

      const isPayment = searchParams.get("action") === "payment";
      const initialCashboxId = cbRes.length > 0 ? cbRes[0].id : "";

      const paymentCategoryId =
        catRes.find((c) => c.name === "Оплата від клієнта")?.id || "";

      setForm((f) => ({
        ...f,
        cashboxId: initialCashboxId,
        ...(isPayment
          ? {
              type: "INCOME",
              counterpartyId: searchParams.get("counterpartyId") || "",
              amount: searchParams.get("amount") || "",
              categoryId: paymentCategoryId,
            }
          : {}),
      }));

      if (isPayment) {
        setIsFormOpen(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cashboxId || !form.amount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await FinanceService.createTransaction({
        date: new Date(form.date).toISOString(),
        type: form.type,
        cashboxId: form.cashboxId,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId || null,
        counterpartyId: form.counterpartyId || null,
        comment: form.comment,
      });
      setIsFormOpen(false);
      setForm({ ...form, amount: "", comment: "" }); // reset some fields
      if (searchParams.get("action") === "payment") {
        setSearchParams({});
      }
      fetchData();
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Помилка при створенні ордера");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Видалити касовий ордер? Борги будуть перераховані."))
      return;
    try {
      await FinanceService.deleteTransaction(id);
      fetchData();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Помилка видалення");
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === "BOTH",
  );

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
          <FileText className="h-6 w-6" /> Журнал касових ордерів
        </h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Створити касовий ордер
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
            Новий касовий ордер
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Type selector */}
            <div className="col-span-full flex gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={form.type === "INCOME"}
                  onChange={() =>
                    setForm((f) => ({ ...f, type: "INCOME", categoryId: "" }))
                  }
                />
                <span className="text-green-600 font-medium">
                  Прибутковий ордер
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={form.type === "OUTCOME"}
                  onChange={() =>
                    setForm((f) => ({ ...f, type: "OUTCOME", categoryId: "" }))
                  }
                />
                <span className="text-red-600 font-medium">
                  Видатковий ордер
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Дата та Час
              </label>
              <input
                type="datetime-local"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Каса / Рахунок
              </label>
              <select
                required
                value={form.cashboxId}
                onChange={(e) =>
                  setForm({ ...form, cashboxId: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Оберіть касу...</option>
                {cashboxes.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name} ({cb.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Сума
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Стаття
              </label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Оберіть статтю...</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Контрагент (для закриття боргів FIFO)
              </label>
              <select
                value={form.counterpartyId}
                onChange={(e) =>
                  setForm({ ...form, counterpartyId: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Без прив'язки...</option>
                {counterparties.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Коментар
              </label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="col-span-full flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
              >
                {t("common.cancel", "Скасувати")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Провести
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Документ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Каса
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Контрагент / Стаття
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Сума
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Дії</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {tx.type === "INCOME" ? (
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          №{tx.number} від{" "}
                          {new Date(tx.date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(tx.date).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {tx.cashboxName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {tx.counterpartyName || "—"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tx.categoryName}
                    </div>
                    {tx.comment && (
                      <div className="text-xs text-gray-400 mt-1">
                        {tx.comment}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div
                      className={`text-sm font-bold ${tx.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {parseFloat(tx.amount.toString()).toFixed(2)} ₴
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Немає касових ордерів
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
