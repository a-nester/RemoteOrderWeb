import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Plus, Store, Edit } from "lucide-react";
import { OrganizationService } from "../../services/organization.service";
import type { Organization, Warehouse } from "../../types/organization";
import UsersList from "./UsersList";
import { useAuthStore } from "../../store/auth.store";

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
  const [salesTypes, setSalesTypes] = useState<string[]>([]);
  const [savingOrg, setSavingOrg] = useState(false);

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
      const [orgData, whData] = await Promise.all([
        OrganizationService.getAllOrganizations(),
        OrganizationService.getWarehouses(),
      ]);
      setOrganizations(orgData);
      if (orgData.length > 0) {
        setOrg(orgData[0]);
        setOrgName(orgData[0].name);
        setOrgDirector(orgData[0].fullDetails || "");
        setSalesTypes(orgData[0].salesTypes || ["Готівковий", "р/р ФОП", "з ПДВ"]);
      } else {
        setOrg(null);
        setOrgName("");
        setOrgDirector("");
        setSalesTypes(["Готівковий", "р/р ФОП", "з ПДВ"]);
      }
      setWarehouses(whData);
    } catch (error) {
      console.error("Failed to load organization settings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!orgName.trim()) return;
    setSavingOrg(true);
    try {
      if (org) {
        const updated = await OrganizationService.updateOrganization({
          id: org.id,
          name: orgName,
          fullDetails: orgDirector,
          salesTypes,
        });
        setOrg(updated);
        setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } else {
        const created = await OrganizationService.createOrganization({
          name: orgName,
          fullDetails: orgDirector,
          salesTypes,
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
    setSalesTypes(["Готівковий", "р/р ФОП", "з ПДВ"]);
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
            {/* Organization Selection Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 shadow rounded-lg p-6 gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Оберіть організацію для налаштування
            </label>
            <select
              value={org?.id || ""}
              onChange={(e) => {
                const selected = organizations.find((o) => o.id === e.target.value);
                if (selected) {
                  setOrg(selected);
                  setOrgName(selected.name);
                  setOrgDirector(selected.fullDetails || "");
                  setSalesTypes(selected.salesTypes || ["Готівковий", "р/р ФОП", "з ПДВ"]);
                }
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
              {!org && <option value="">Створення нової організації...</option>}
            </select>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
          >
            <Plus className="mr-2" size={18} />
            Додати нову організацію
          </button>
        </div>

        {/* Organization Name Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("organization.details", "Organization Details")}
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
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
            <div className="flex-1">
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
        </div>

        {/* Sales Types Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("organization.salesTypes", "Види продажу")}
          </h2>
          <div className="flex flex-wrap gap-6">
            {["Готівковий", "р/р ФОП", "з ПДВ"].map(type => (
              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={salesTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSalesTypes(prev => [...prev, type]);
                    } else {
                      setSalesTypes(prev => prev.filter(t => t !== type));
                    }
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{type}</span>
              </label>
            ))}
          </div>
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
