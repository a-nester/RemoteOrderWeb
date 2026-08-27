import React, { useState, useEffect } from "react";
import type { Counterparty, CounterpartyGroup } from "../../types/counterparty";
import type { PriceType } from "../../types/priceType";
import type { Territory } from "../../types/territory";
import { PriceTypesService } from "../../services/priceTypes.service";
import { OrganizationService } from "../../services/organization.service";
import { TerritoryService } from "../../services/territory.service";
import { CreateTerritoryModal } from "../../components/CreateTerritoryModal";
import type { Organization, Warehouse } from "../../types/organization";
import { Plus } from "lucide-react";

interface Props {
  counterparty?: Counterparty | null;
  groups: CounterpartyGroup[];
  onSave: (data: Partial<Counterparty>) => Promise<void>;
  onCancel: () => void;
}

export default function CounterpartyForm({
  counterparty,
  groups,
  onSave,
  onCancel,
}: Props) {
  const [formData, setFormData] = useState<Partial<Counterparty>>({
    name: "",
    address: "",
    phone: "",
    contactPerson: "",
    isBuyer: false,
    isSeller: false,
    priceTypeId: "",
    groupId: "",
    defaultSalesType: "Готівковий",
    organizationId: "",
    territoryId: "",
  });
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const salesTypes = ["Готівковий", "р/р ФОП", "з ПДВ"];
  const [isCreateTerritoryOpen, setIsCreateTerritoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [types, whs, orgs, terrs] = await Promise.all([
        PriceTypesService.fetchPriceTypes(),
        OrganizationService.getWarehouses(),
        OrganizationService.getAllOrganizations(),
        TerritoryService.getAll(),
      ]);
      setPriceTypes(types);
      setWarehouses(whs);
      setOrganizations(orgs);
      setTerritories(terrs);

      // Auto pre-select default organization for new counterparties
      if (!counterparty) {
        const defaultOrg = orgs.find((o) => o.isDefault) || orgs[0];
        if (defaultOrg) {
          setFormData((prev) => ({
            ...prev,
            organizationId: prev.organizationId || defaultOrg.id,
          }));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (counterparty) {
      setFormData(counterparty);
    }
    loadData();
  }, [counterparty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.warehouseId) {
      setError("Будь ласка, оберіть Склад для цього клієнта.");
      return;
    }

    // Sanitize: convert empty strings to null for optional foreign keys
    const payload = {
      ...formData,
      priceTypeId: formData.priceTypeId || undefined,
      groupId: formData.groupId || undefined,
      warehouseId: formData.warehouseId || undefined,
      organizationId: formData.organizationId || undefined,
      territoryId: formData.territoryId || undefined,
      defaultSalesType: formData.defaultSalesType || "Готівковий",
    };
    await onSave(payload);
  };

  const handleTerritoryCreated = (newTerritory: Territory) => {
    setTerritories((prev) => [...prev, newTerritory].sort((a, b) => a.name.localeCompare(b.name)));
    setFormData((prev) => ({ ...prev, territoryId: newTerritory.id }));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 dark:text-white">
            {counterparty ? "Редагувати контрагента" : "Новий контрагент"}
          </h2>
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Назва <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Телефон
                </label>
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Адреса
                </label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Контактна особа
                </label>
                <input
                  type="text"
                  value={formData.contactPerson || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Група
                </label>
                <select
                  value={formData.groupId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, groupId: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Без групи</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Блок Територія */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Територія
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.territoryId || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, territoryId: e.target.value })
                    }
                    className="flex-1 rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 text-sm"
                  >
                    <option value="">не задано</option>
                    {territories.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCreateTerritoryOpen(true)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 mr-1 text-indigo-600 dark:text-indigo-400" />
                    Додати територію
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Організація
                </label>
                <select
                  value={formData.organizationId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, organizationId: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Не обрано</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Тип цін
                </label>
                <select
                  value={formData.priceTypeId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, priceTypeId: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Обрати тип ціни</option>
                  {priceTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Склад <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.warehouseId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, warehouseId: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Оберіть Склад</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Вид продажу (за зам.)
                </label>
                <select
                  value={formData.defaultSalesType || "Готівковий"}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultSalesType: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {salesTypes.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isBuyer}
                  onChange={(e) =>
                    setFormData({ ...formData, isBuyer: e.target.checked })
                  }
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Покупець
                </span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isSeller}
                  onChange={(e) =>
                    setFormData({ ...formData, isSeller: e.target.checked })
                  }
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Постачальник
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Зберегти
              </button>
            </div>
          </form>
        </div>
      </div>

      <CreateTerritoryModal
        isOpen={isCreateTerritoryOpen}
        onClose={() => setIsCreateTerritoryOpen(false)}
        onCreated={handleTerritoryCreated}
      />
    </>
  );
}
