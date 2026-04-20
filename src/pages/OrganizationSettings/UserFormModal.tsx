import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Save } from "lucide-react";
import type { User } from "../../services/users.service";
import { CounterpartyService } from "../../services/counterparty.service";
import { OrganizationService } from "../../services/organization.service";
import type { Counterparty } from "../../types/counterparty";
import type { Warehouse } from "../../types/organization";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData: User | null;
}

const defaultPermissions = {
  priceEditor: { priceSettings: false, priceTypes: false },
  reports: { stockBalances: false, inventory: false, sales: false, reconciliation: false, cashflow: false },
  finance: { transactions: false, cashboxes: false },
  documents: { orders: true, realizations: true, goodsReceipts: false, buyerReturns: false, supplierReturns: false }
};

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
  const [warehouseId, setWarehouseId] = useState("");
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<any>(defaultPermissions);

  useEffect(() => {
    CounterpartyService.getAll().then(setCounterparties).catch(console.error);
    OrganizationService.getWarehouses().then(setWarehouses).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email || "");
      setRole(initialData.role || "client");
      setCounterpartyId(initialData.counterpartyId || "");
      setWarehouseId(initialData.warehouseId || "");
      setPassword(""); // Never populate password

      if (initialData.permissions) {
          setPermissions({
              priceEditor: { ...defaultPermissions.priceEditor, ...(initialData.permissions.priceEditor || {}) },
              reports: { ...defaultPermissions.reports, ...(initialData.permissions.reports || {}) },
              finance: { ...defaultPermissions.finance, ...(initialData.permissions.finance || {}) },
              documents: { ...defaultPermissions.documents, ...(initialData.permissions.documents || {}) }
          });
      } else {
          setPermissions(defaultPermissions);
      }
    } else {
      setEmail("");
      setRole("client");
      setCounterpartyId("");
      setWarehouseId("");
      setPassword("");
      setPermissions(defaultPermissions);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: any = { email, role, permissions };
      if (role === "client" || role === "manager") {
        data.warehouseId = warehouseId;
      }
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

          {(role === "client" || role === "manager") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Склад (Обов'язково для менеджерів і клієнтів)
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required={role === "client" || role === "manager"}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">-- Оберіть склад --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* Дозволи - Permissions Block */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Дозволи (Permisses)
            </h4>
            {role === "admin" ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Адміністратор має повний доступ до всіх розділів за замовчуванням.
              </p>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                
                {/* Редактор цін */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Редактор цін</span>
                  <div className="space-y-2 pl-2 text-sm">
                    {Object.entries({
                      priceSettings: "Налаштування цін",
                      priceTypes: "Типи цін"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                          checked={permissions.priceEditor[key] || false}
                          onChange={(e) => setPermissions((p: any) => ({ ...p, priceEditor: { ...p.priceEditor, [key]: e.target.checked } }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Звіти */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Звіти</span>
                  <div className="space-y-2 pl-2 text-sm">
                    {Object.entries({
                      stockBalances: "Залишки на складах",
                      inventory: "Відомість по товарах",
                      sales: "Продажі",
                      reconciliation: "Акт звірки",
                      cashflow: "Рух коштів"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                          checked={permissions.reports[key] || false}
                          onChange={(e) => setPermissions((p: any) => ({ ...p, reports: { ...p.reports, [key]: e.target.checked } }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Фінанси */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Фінанси</span>
                  <div className="space-y-2 pl-2 text-sm">
                    {Object.entries({
                      transactions: "Каса",
                      cashboxes: "Налаштування каси"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                          checked={permissions.finance[key] || false}
                          onChange={(e) => setPermissions((p: any) => ({ ...p, finance: { ...p.finance, [key]: e.target.checked } }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Документи */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Документи</span>
                  <div className="space-y-2 pl-2 text-sm">
                    {Object.entries({
                      orders: "Замовлення",
                      realizations: "Реалізації",
                      goodsReceipts: "Поступлення",
                      buyerReturns: "Повернення від покупця",
                      supplierReturns: "Повернення постачальнику"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                          checked={permissions.documents[key] || false}
                          onChange={(e) => setPermissions((p: any) => ({ ...p, documents: { ...p.documents, [key]: e.target.checked } }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

              </div>
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
