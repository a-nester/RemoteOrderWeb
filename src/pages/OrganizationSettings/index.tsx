import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Plus, Store, Edit, Star, CheckCircle2 } from "lucide-react";
import { OrganizationService } from "../../services/organization.service";
import { ProductsService } from "../../services/products.service";
import type { Organization, Warehouse, OrganizationRequisites } from "../../types/organization";
import UsersList from "./UsersList";
import { useAuthStore } from "../../store/auth.store";

const DEFAULT_REQUISITES: OrganizationRequisites = {
  edrpou: "",
  tin: "",
  accountNumber: "",
  bankName: "",
  certificateNumber: "",
  address: "",
  placeOfIssue: "",
  printedFields: {
    edrpou: false,
    tin: false,
    accountNumber: false,
    bankName: false,
    certificateNumber: false,
    address: false,
    placeOfIssue: true,
  },
};

const REQUISITE_FIELDS: Array<{
  key: keyof Omit<OrganizationRequisites, 'printedFields'>;
  label: string;
  placeholder: string;
}> = [
  { key: "edrpou", label: "ЄДРПОУ", placeholder: "напр. 12345678" },
  { key: "tin", label: "ІПН", placeholder: "напр. 123456789012" },
  { key: "accountNumber", label: "Р/р", placeholder: "напр. UA123456789000000123456789012" },
  { key: "bankName", label: "Назва банку", placeholder: "напр. АТ КБ 'ПРИВАТБАНК'" },
  { key: "certificateNumber", label: "Номер свідоцтва", placeholder: "напр. 100123456" },
  { key: "address", label: "Адреса", placeholder: "напр. м. Рівне, вул. Соборна, 1" },
  { key: "placeOfIssue", label: "Місце складання (для ПДВ)", placeholder: "напр. с. Пасіки" },
];

export default function OrganizationSettings() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<"general" | "users">("general");
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Org Form State
  const [orgName, setOrgName] = useState("");
  const [orgDirector, setOrgDirector] = useState("");
  const [selectedSalesType, setSelectedSalesType] = useState<string>("Готівковий");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [vatCostCoefficient, setVatCostCoefficient] = useState<string>("1.345");
  const [savingOrg, setSavingOrg] = useState(false);

  // Requisites State
  const [requisites, setRequisites] = useState<OrganizationRequisites>(DEFAULT_REQUISITES);
  const [isEditingRequisites, setIsEditingRequisites] = useState(false);
  const [savingRequisites, setSavingRequisites] = useState(false);

  // Warehouse Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [whName, setWhName] = useState("");
  const [whAddress, setWhAddress] = useState("");
  const [savingWh, setSavingWh] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgData, whData, productsRes] = await Promise.all([
        OrganizationService.getAllOrganizations(),
        OrganizationService.getWarehouses(),
        ProductsService.fetchProducts().catch(() => ({ products: [], timestamp: Date.now() })),
      ]);
      
      const uniqueCats = Array.from(
        new Set(productsRes.products.map((p) => p.category).filter(Boolean))
      ).sort() as string[];
      setAvailableCategories(uniqueCats);

      setOrganizations(orgData);
      if (orgData.length > 0) {
        const firstOrg = orgData[0];
        setOrg(firstOrg);
        setOrgName(firstOrg.name);
        setOrgDirector(firstOrg.fullDetails || "");
        setSelectedSalesType(firstOrg.salesTypes?.[0] || "Готівковий");
        setSelectedCategories(firstOrg.categories ?? uniqueCats);
        setVatCostCoefficient(firstOrg.vatCostCoefficient !== undefined ? String(firstOrg.vatCostCoefficient) : "1.345");
        setRequisites(firstOrg.requisites || DEFAULT_REQUISITES);
        setIsEditingRequisites(false);
      } else {
        setOrg(null);
        setOrgName("");
        setOrgDirector("");
        setSelectedSalesType("Готівковий");
        setSelectedCategories(uniqueCats);
        setVatCostCoefficient("1.345");
        setRequisites(DEFAULT_REQUISITES);
        setIsEditingRequisites(false);
      }
      setWarehouses(whData);
    } catch (error) {
      console.error("Failed to load organization settings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRequisites = async () => {
    if (!org) {
      alert("Будь ласка, спочатку оберіть або збережіть організацію.");
      return;
    }
    setSavingRequisites(true);
    try {
      const updated = await OrganizationService.updateOrganization({
        id: org.id,
        requisites: requisites,
      });
      setOrg(updated);
      setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setIsEditingRequisites(false);
      alert(t("common.saved", "Реквізити успішно збережено"));
    } catch (error) {
      console.error("Failed to save requisites", error);
      alert(t("common.error", "Помилка збереження реквізитів"));
    } finally {
      setSavingRequisites(false);
    }
  };

  const handleSetDefaultOrg = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const updatedOrgs = await OrganizationService.setDefaultOrganization(id);
      setOrganizations(updatedOrgs);
      const defaultOrg = updatedOrgs.find((o) => o.id === id);
      if (defaultOrg && org?.id === id) {
        setOrg(defaultOrg);
      }
    } catch (error) {
      console.error("Failed to set default organization", error);
      alert("Помилка встановлення організації за замовчуванням");
    }
  };

  const handleSaveOrg = async () => {
    if (!orgName.trim()) return;
    setSavingOrg(true);
    const parsedCoeff = parseFloat(vatCostCoefficient);
    const coeffValue = isNaN(parsedCoeff) ? 1.0 : parsedCoeff;

    try {
      if (org) {
        const updated = await OrganizationService.updateOrganization({
          id: org.id,
          name: orgName,
          fullDetails: orgDirector,
          salesTypes: [selectedSalesType],
          categories: selectedCategories,
          vatCostCoefficient: coeffValue,
        });
        setOrg(updated);
        setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } else {
        const created = await OrganizationService.createOrganization({
          name: orgName,
          fullDetails: orgDirector,
          salesTypes: [selectedSalesType],
          categories: selectedCategories,
          vatCostCoefficient: coeffValue,
        });
        setOrg(created);
        setOrganizations((prev) => [...prev, created]);
      }
      alert(t("common.saved", "Saved successfully"));
    } catch (error) {
      console.error("Failed to save org", error);
      alert(t("common.error", "Error saving"));
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateNew = () => {
    setOrg(null);
    setOrgName("");
    setOrgDirector("");
    setSelectedSalesType("Готівковий");
    setSelectedCategories(availableCategories);
    setVatCostCoefficient("1.345");
    setRequisites(DEFAULT_REQUISITES);
    setIsEditingRequisites(false);
  };

  const handleOpenModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setWhName(warehouse.name);
      setWhAddress(warehouse.address || "");
    } else {
      setEditingWarehouse(null);
      setWhName("");
      setWhAddress("");
    }
    setIsModalOpen(true);
  };

  const handleSaveWarehouse = async () => {
    if (!whName.trim() || !org) return;
    setSavingWh(true);
    try {
      if (editingWarehouse) {
        const updated = await OrganizationService.updateWarehouse(
          editingWarehouse.id,
          {
            name: whName,
            address: whAddress,
          },
        );
        setWarehouses((prev) =>
          prev.map((w) => (w.id === updated.id ? updated : w)),
        );
      } else {
        const created = await OrganizationService.createWarehouse({
          name: whName,
          address: whAddress,
          organizationId: org.id,
        });
        setWarehouses((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save warehouse", error);
      alert(t("common.error", "Error saving"));
    } finally {
      setSavingWh(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
        <Store className="mr-3" />
        {t("menu.organizationSettings", "Organization Settings")}
      </h1>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeTab === "general"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {t("menu.organizationSettings", "Загальні")}
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Користувачі
          </button>
        )}
      </div>

      {activeTab === "general" ? (
        <>
          <div className="space-y-8">
        {/* Organization Selection Header (Visual Cards List) */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Оберіть організацію для налаштування
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Натисніть на картку організації для її вибору або встановіть організацію за замовчуванням
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus className="mr-1.5" size={18} />
              Додати нову організацію
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {organizations.map((o) => {
              const isSelected = org?.id === o.id;
              const isDefault = !!o.isDefault;

              return (
                <div
                  key={o.id}
                  onClick={() => {
                    setOrg(o);
                    setOrgName(o.name);
                    setOrgDirector(o.fullDetails || "");
                    setSelectedSalesType(o.salesTypes?.[0] || "Готівковий");
                    setSelectedCategories(o.categories ?? availableCategories);
                    setVatCostCoefficient(o.vatCostCoefficient !== undefined ? String(o.vatCostCoefficient) : "1.345");
                    setRequisites(o.requisites || DEFAULT_REQUISITES);
                    setIsEditingRequisites(false);
                  }}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm"
                  }`}
                >
                  <div>
                    {/* Top Row: Default Badge & Selection Checkmark */}
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isDefault ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
                            За замовчуванням
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleSetDefaultOrg(e, o.id)}
                            title="Встановити як організацію за замовчуванням"
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 transition-colors"
                          >
                            <Star className="w-3 h-3 mr-1 text-gray-400 hover:text-amber-500" />
                            Зробити за замовчуванням
                          </button>
                        )}
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </div>

                    {/* Organization Name */}
                    <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug line-clamp-2 mb-1">
                      {o.name}
                    </h3>

                    {/* Director */}
                    {o.fullDetails && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-3">
                        {o.fullDetails}
                      </p>
                    )}
                  </div>

                  {/* Footer Meta */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs mt-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {o.salesTypes?.[0] || "Готівковий"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {isSelected ? "Обрана" : "Натисніть щоб обрати"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Organization Name Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("organization.details", "Organization Details")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("organization.name", "Name")}
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ПІБ Керівника (для друку в звітах)
              </label>
              <input
                type="text"
                value={orgDirector}
                onChange={(e) => setOrgDirector(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="напр. Погребицький Ю.В."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Вид продажу
              </label>
              <select
                value={selectedSalesType}
                onChange={(e) => setSelectedSalesType(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2 px-3"
              >
                <option value="Готівковий">Готівковий</option>
                <option value="р/р ФОП">р/р ФОП</option>
                <option value="з ПДВ">з ПДВ</option>
              </select>
            </div>
          </div>

          {selectedSalesType === "з ПДВ" && (
            <div className="mb-4 p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
              <label className="block text-sm font-medium text-purple-900 dark:text-purple-300 mb-1">
                Коефіцієнт розрахунку собівартості з ПДВ
              </label>
              <input
                type="number"
                step="0.001"
                value={vatCostCoefficient}
                onChange={(e) => setVatCostCoefficient(e.target.value)}
                placeholder="1.345"
                className="w-full max-w-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                Множник собівартості списуваного товару для виду продажу з ПДВ (наприклад 1.345)
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSaveOrg}
              disabled={savingOrg}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="mr-2" size={18} />
              {savingOrg
                ? t("common.saving", "Saving...")
                : org 
                  ? t("common.save", "Save") 
                  : "Створити"}
            </button>
          </div>

          {/* Requisites Block */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Реквізити
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingRequisites(true)}
                disabled={!org || isEditingRequisites}
                className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !org || isEditingRequisites
                    ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-gray-700 dark:text-indigo-300 dark:hover:bg-gray-600 border border-indigo-200 dark:border-gray-600"
                }`}
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Редагувати
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {REQUISITE_FIELDS.map((f) => {
                const isChecked = !!requisites.printedFields?.[f.key];
                const fieldValue = requisites[f.key] || "";

                return (
                  <div
                    key={f.key}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30"
                  >
                    <input
                      type="checkbox"
                      disabled={!isEditingRequisites}
                      checked={isChecked}
                      onChange={(e) => {
                        if (!isEditingRequisites) return;
                        setRequisites((prev) => ({
                          ...prev,
                          printedFields: {
                            ...(prev.printedFields || {}),
                            [f.key]: e.target.checked,
                          },
                        }));
                      }}
                      title={
                        isEditingRequisites
                          ? "Включити в друковану накладну"
                          : "Перемикання доступне тільки в режимі редагування"
                      }
                      className={`w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                        isEditingRequisites ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
                        <span>{f.label}</span>
                        {isChecked && (
                          <span className="text-[10px] text-green-600 dark:text-green-400 font-normal">
                            (у накладній)
                          </span>
                        )}
                      </div>
                      {isEditingRequisites ? (
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRequisites((prev) => ({
                              ...prev,
                              [f.key]: val,
                            }));
                          }}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-1.5 text-sm border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {fieldValue || <span className="text-gray-400 font-normal italic">—</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleSaveRequisites}
                disabled={!isEditingRequisites || savingRequisites}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md text-white transition-colors ${
                  !isEditingRequisites || savingRequisites
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                <Save className="mr-2 h-4 w-4" />
                {savingRequisites ? "Збереження..." : "Зберегти"}
              </button>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Категорії товарів для підбору
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategories([...availableCategories])}
                className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-gray-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-gray-600 font-medium transition-colors"
              >
                Обрати всі
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600 font-medium transition-colors"
              >
                Зняти всі
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Позначені категорії будуть відображатися у списках підбору товарів в замовленнях, реалізаціях та поступленнях.
          </p>
          {availableCategories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Категорії не знайдені в системі</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availableCategories.map((cat) => {
                const isChecked = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex items-center space-x-2.5 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories((prev) => [...prev, cat]);
                        } else {
                          setSelectedCategories((prev) => prev.filter((c) => c !== cat));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {cat}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Warehouses Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("organization.warehouses", "Warehouses")}
            </h2>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus size={18} className="mr-1" />
              {t("action.add", "Add")}
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("common.name", "Name")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("common.address", "Address")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("common.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {warehouses.map((wh) => (
                  <tr key={wh.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {wh.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {wh.address || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(wh)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                      >
                        <Edit size={18} />
                      </button>
                      {/* Implement delete if needed, for now just edit */}
                    </td>
                  </tr>
                ))}
                {warehouses.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {t("common.noData", "No warehouses found")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingWarehouse
                ? t("warehouse.edit", "Edit Warehouse")
                : t("warehouse.add", "Add Warehouse")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("common.name", "Name")}
                </label>
                <input
                  type="text"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("common.address", "Address")}
                </label>
                <input
                  type="text"
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleSaveWarehouse}
                disabled={savingWh}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {savingWh
                  ? t("common.saving", "Saving...")
                  : t("common.save", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <div className="-mx-4 md:mx-0">
           <UsersList />
        </div>
      )}
    </div>
  );
}
