import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Save } from "lucide-react";
import type { User } from "../../services/users.service";
import { CounterpartyService } from "../../services/counterparty.service";
import type { Counterparty } from "../../types/counterparty";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData: User | null;
}

export default function UserFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: UserFormModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "client">("client");
  const [password, setPassword] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    CounterpartyService.getAll().then(setCounterparties).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email || "");
      setRole(initialData.role || "client");
      setCounterpartyId(initialData.counterpartyId || "");
      setPassword(""); // Never populate password
    } else {
      setEmail("");
      setRole("client");
      setCounterpartyId("");
      setPassword("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: any = { email, role };
      if (role === "client" && counterpartyId) {
        data.counterpartyId = counterpartyId;
      }
      if (password.trim() !== "") {
        data.password = password;
      }
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {initialData ? "Редагувати користувача" : "Додати користувача"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (Логін)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Роль
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="admin">Адміністратор (Admin)</option>
              <option value="manager">Менеджер (Manager)</option>
              <option value="client">Клієнт (Client)</option>
            </select>
          </div>

          {role === "client" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Прив'язаний Контрагент (Обов'язково для клієнта)
              </label>
              <select
                value={counterpartyId}
                onChange={(e) => setCounterpartyId(e.target.value)}
                required={role === "client"}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">-- Оберіть контрагента --</option>
                {counterparties.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Новий пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                initialData
                  ? "Залиште пустим, щоб не змінювати"
                  : "Обов'язково для нових"
              }
              required={!initialData}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
            />
            {initialData && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Введіть пароль лише якщо бажаєте його змінити.
              </p>
            )}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Save size={16} className="mr-2" />
              {saving
                ? t("common.saving", "Saving...")
                : t("common.save", "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
