import { useState, useEffect } from "react";
import { CounterpartyService } from "../../../services/counterparty.service";
import { UsersService } from "../../../services/users.service";
import { useAuthStore } from "../../../store/auth.store";
import type { Counterparty } from "../../../types/counterparty";
import { X, Search, CheckSquare, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (clientIds: string[], dayOfWeek: number) => void;
  preselectedDay?: number;
  targetUserId?: string;
}

export default function AddClientModal({
  isOpen,
  onClose,
  onAdd,
  preselectedDay = 1,
  targetUserId,
}: Props) {
  const { t } = useTranslation();
  const loggedUser = useAuthStore((state) => state.user);
  const [clients, setClients] = useState<Counterparty[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState(preselectedDay);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      setDayOfWeek(preselectedDay);
      setSearch("");
      setSelectedClientIds([]);
    }
  }, [isOpen, preselectedDay, targetUserId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await CounterpartyService.getAll();
      let visibleTerritories: string[] = [];

      if (loggedUser?.role === 'admin' && targetUserId) {
        try {
          const users = await UsersService.getUsers();
          const mgr = users.find(u => String(u.id) === String(targetUserId));
          if (mgr?.visibleTerritories && mgr.visibleTerritories.length > 0) {
            visibleTerritories = mgr.visibleTerritories;
          }
        } catch (e) {
          console.error("Failed to fetch target user info:", e);
        }
      } else if (loggedUser?.role === 'manager' && loggedUser.visibleTerritories && loggedUser.visibleTerritories.length > 0) {
        visibleTerritories = loggedUser.visibleTerritories;
      }

      if (visibleTerritories.length > 0) {
        setClients(data.filter(c => c.territoryId && visibleTerritories.includes(c.territoryId)));
      } else {
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to load clients", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = search
    ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const toggleClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredClients.map((c) => c.id);
    const allSelected = filteredIds.every((id) => selectedClientIds.includes(id));

    if (allSelected) {
      setSelectedClientIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedClientIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClientIds.length === 0 || !dayOfWeek) return;
    onAdd(selectedClientIds, dayOfWeek);
    setSelectedClientIds([]);
    setSearch("");
  };

  if (!isOpen) return null;

  const isAllFilteredSelected =
    filteredClients.length > 0 &&
    filteredClients.every((c) => selectedClientIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {t("planner.addClientTitle", "Додати контрагентів у графік")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Day selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("planner.selectDay", "День тижня")}
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value={1}>{t("planner.days.1", "Понеділок")}</option>
              <option value={2}>{t("planner.days.2", "Вівторок")}</option>
              <option value={3}>{t("planner.days.3", "Середа")}</option>
              <option value={4}>{t("planner.days.4", "Четвер")}</option>
              <option value={5}>{t("planner.days.5", "П'ятниця")}</option>
              <option value={6}>{t("planner.days.6", "Субота")}</option>
              <option value={7}>{t("planner.days.7", "Неділя")}</option>
            </select>
          </div>

          {/* Client Search & Select All */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                {t("planner.selectClient", "Контрагенти")} ({selectedClientIds.length})
              </label>
              {filteredClients.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {isAllFilteredSelected ? (
                    <>
                      <CheckSquare size={12} /> Зняти виділення
                    </>
                  ) : (
                    <>
                      <Square size={12} /> Обрати всіх ({filteredClients.length})
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="relative mb-2">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder={t("common.search", "Пошук за назвою...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Client Checkbox List */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {t("common.loading", "Завантаження...")}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {t("planner.noClientsFound", "Клієнтів не знайдено")}
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedClientIds.includes(client.id);
                  return (
                    <label
                      key={client.id}
                      className={`flex items-center justify-between p-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-700/50 ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 font-semibold"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          value={client.id}
                          checked={isSelected}
                          onChange={() => toggleClient(client.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{client.name}</span>
                      </div>
                      {client.territoryName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {client.territoryName}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {t("common.cancel", "Скасувати")}
            </button>
            <button
              type="submit"
              disabled={selectedClientIds.length === 0}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common.add", "Додати")} {selectedClientIds.length > 0 ? `(${selectedClientIds.length})` : ""}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
