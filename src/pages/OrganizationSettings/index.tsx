import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Save, Plus, Store, Edit } from "lucide-react";
import { OrganizationService } from "../../services/organization.service";
import type { Organization, Warehouse } from "../../types/organization";
import UsersList from "./UsersList";

type Tab = "main" | "users";

export default function OrganizationSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("main");

  // Org Form State
  const [orgName, setOrgName] = useState("");
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
        OrganizationService.getOrganization(),
        OrganizationService.getWarehouses(),
      ]);
      setOrg(orgData);
      setOrgName(orgData.name);
      setWarehouses(whData);
    } catch (error) {
      console.error("Failed to load organization settings", error);
      // Default blank if not found/error
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!org) return;
    setSavingOrg(true);
    try {
      const updated = await OrganizationService.updateOrganization({
        id: org.id,
        name: orgName,
      });
      setOrg(updated);
      alert(t("common.saved", "Saved successfully"));
    } catch (error) {
      console.error("Failed to save org", error);
      alert(t("common.error", "Error saving"));
    } finally {
      setSavingOrg(false);
    }
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

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("main")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "main"
                ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
            }`}
          >
            Основні
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "users"
                ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
            }`}
          >
            Користувачі
          </button>
        </nav>
      </div>

      {activeTab === "main" && (
        <div className="space-y-8">
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
              <button
                onClick={handleSaveOrg}
                disabled={savingOrg}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="mr-2" size={18} />
                {savingOrg
                  ? t("common.saving", "Saving...")
                  : t("common.save", "Save")}
              </button>
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
      )}

      {activeTab === "users" && <UsersList />}

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
    </div>
  );
}
