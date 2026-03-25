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
  MoreVertical,
  Copy,
  Filter as FilterIcon,
  ExternalLink,
  X,
  Edit,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";

// --- Custom Dropdown Component ---
const CashTransactionDropdown = ({
  tx,
  onCopy,
  onFilter,
  onOpen,
  onEdit,
  onDelete,
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={(e) => handleAction(e, onCopy)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="mr-3 h-4 w-4 text-indigo-500" /> Скопіювати
            </button>
            <button
              onClick={(e) => handleAction(e, onFilter)}
              disabled={!tx.counterpartyName}
              className={`flex items-center w-full px-4 py-2 text-sm ${!tx.counterpartyName ? "text-gray-400 cursor-not-allowed" : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
            >
              <FilterIcon className="mr-3 h-4 w-4 text-blue-500" /> Фільтр за
              контрагентом
            </button>
            <button
              onClick={(e) => handleAction(e, onOpen)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ExternalLink className="mr-3 h-4 w-4 text-green-500" /> Відкрити
              у новому вікні
            </button>
            <button
              onClick={(e) => handleAction(e, onEdit)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit className="mr-3 h-4 w-4 text-orange-500" /> Редагувати
            </button>
            <button
              onClick={(e) => handleAction(e, onDelete)}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Trash2 className="mr-3 h-4 w-4" /> Видалити
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const { user, setPreferences } = useAuthStore();

  // Custom Filters
  const [filterDocType, setFilterDocType] = useState<string>(
    user?.preferences?.cashFilterType || "ALL",
  );
  const [filterCounterparty, setFilterCounterparty] = useState<string>("");

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem("cash_startDate") || "";
  });
  const [endDate, setEndDate] = useState(() => {
    const saved = localStorage.getItem("cash_endDate");
    if (saved) return saved;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  });

  useEffect(() => {
    localStorage.setItem("cash_startDate", startDate);
    localStorage.setItem("cash_endDate", endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (user && filterDocType !== user.preferences?.cashFilterType) {
      const newPrefs = { ...user.preferences, cashFilterType: filterDocType };
      setPreferences(newPrefs);
      AuthService.updatePreferences(newPrefs).catch(console.error);
    }
  }, [filterDocType, user, setPreferences]);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
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
    fetchData(true);
  }, []);

  const fetchData = async (isInitialLoad = false) => {
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

      const isPayment =
        isInitialLoad && searchParams.get("action") === "payment";
      const initialCashboxId = cbRes.length > 0 ? cbRes[0].id : "";

      const paymentCategoryId =
        catRes.find((c) => c.name === "Оплата від клієнта")?.id || "";

      if (isInitialLoad) {
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
      const payload = {
        date: new Date(form.date).toISOString(),
        type: form.type,
        cashboxId: form.cashboxId,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId || null,
        counterpartyId: form.counterpartyId || null,
        comment: form.comment,
      };

      if (editingId) {
        await FinanceService.updateTransaction(editingId, payload);
      } else {
        await FinanceService.createTransaction(payload);
      }
      setIsFormOpen(false);
      setEditingId(null);
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

  let filteredTransactions = transactions;
  if (filterDocType !== "ALL") {
    filteredTransactions = filteredTransactions.filter(
      (tx) => tx.type === filterDocType,
    );
  }
  if (filterCounterparty) {
    filteredTransactions = filteredTransactions.filter(
      (tx) => tx.counterpartyName === filterCounterparty,
    );
  }
  if (startDate || endDate) {
    filteredTransactions = filteredTransactions.filter((tx) => {
      const date = tx.date.split("T")[0];
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });
  }

  const handleCopyTransaction = (tx: CashTransaction) => {
    // Determine category ID or counterparty ID if possible
    // Note: tx object might not have raw categoryId/counterpartyId depending on backend,
    // but we can try to find them by name from our loaded arrays.
    const matchedCategory = categories.find((c) => c.name === tx.categoryName);
    const matchedCP = counterparties.find(
      (cp) => cp.name === tx.counterpartyName,
    );

    // Try generating local ISO
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = new Date(new Date(tx.date).getTime() - tzoffset)
      .toISOString()
      .slice(0, 16);

    setForm({
      date: localISOTime,
      type: tx.type,
      cashboxId: cashboxes.find((c) => c.name === tx.cashboxName)?.id || "",
      categoryId: matchedCategory?.id || "",
      counterpartyId: matchedCP?.id || "",
      amount: tx.amount.toString(),
      comment: tx.comment || "",
    });
    setEditingId(null); // Important: don't link edit state on copy
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditTransaction = (tx: CashTransaction) => {
    const matchedCategory = categories.find((c) => c.name === tx.categoryName);
    const matchedCP = counterparties.find(
      (cp) => cp.name === tx.counterpartyName,
    );

    const tzoffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = new Date(new Date(tx.date).getTime() - tzoffset)
      .toISOString()
      .slice(0, 16);

    setForm({
      date: localISOTime,
      type: tx.type,
      cashboxId: cashboxes.find((c) => c.name === tx.cashboxName)?.id || "",
      categoryId: matchedCategory?.id || "",
      counterpartyId: matchedCP?.id || "",
      amount: tx.amount.toString(),
      comment: tx.comment || "",
    });
    setEditingId(tx.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 shadow-sm rounded-lg sticky top-0 z-20 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-row">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
            <FileText className="h-6 w-6" /> Журнал касових ордерів
          </h1>
          <button
            onClick={() => setIsFormOpen(true)}
            className="w-full sm:w-auto flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-5 w-5 mr-2" />
            Створити касовий ордер
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {filterCounterparty && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">
              <span className="truncate max-w-[150px]">
                {filterCounterparty}
              </span>
              <button
                onClick={() => setFilterCounterparty("")}
                className="hover:text-blue-900 dark:hover:text-blue-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
            />
          </div>

          <select
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            className="w-full sm:w-auto rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
          >
            <option value="ALL">Всі типи документів</option>
            <option value="INCOME">Прибуткові ордери</option>
            <option value="OUTCOME">Видаткові ордери</option>
          </select>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
            {editingId ? "Редагування касового ордеру" : "Новий касовий ордер"}
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
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                }}
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
        <div
          className="overflow-x-auto"
          style={{ maxHeight: "calc(100vh - 220px)" }}
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
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
                <th scope="col" className="relative px-6 py-3 w-16">
                  <span className="sr-only">Дії</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((tx) => (
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
                    <CashTransactionDropdown
                      tx={tx}
                      onCopy={() => handleCopyTransaction(tx)}
                      onFilter={() =>
                        setFilterCounterparty(tx.counterpartyName || "")
                      }
                      onOpen={() => window.open(window.location.href, "_blank")}
                      onEdit={() => handleEditTransaction(tx)}
                      onDelete={() => handleDelete(tx.id)}
                    />
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
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
