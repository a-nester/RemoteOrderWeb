import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Save,
  Search,
  Check,
  ChevronDown,
  Plus,
} from "lucide-react";
import { CounterpartyService } from "../services/counterparty.service";
import { ProductsService } from "../services/products.service";
import { PriceTypesService } from "../services/priceTypes.service";
import type { OrderItem, Order } from "../types/order";
import { OrderStatus } from "../types/order";
import type { Counterparty } from "../types/counterparty";
import type { Product } from "../types/product";
import type { PriceType } from "../types/priceType";
import { ReportsService } from "../services/reports.service";
import type { StockBalance } from "../services/reports.service";
import { OrganizationService } from "../services/organization.service";
import type { Warehouse } from "../types/organization";
import ProductSelector from "./ProductSelector";
import OrderItemsTable from "./OrderItemsTable";
import QuantityModal from "./QuantityModal";

interface OrderFormProps {
  initialData?: Order;
  onSubmit: (data: any, action?: "save" | "saveAndPost") => Promise<void>;
  saving: boolean;
  title: string;
  isRealization?: boolean;
}

export default function OrderForm({
  initialData,
  onSubmit,
  saving,
  title,
  isRealization = false,
}: OrderFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);

  // Data
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Form State
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split("T")[0],
  );
  const [status, setStatus] = useState<OrderStatus>(
    initialData?.status || OrderStatus.NEW,
  );
  const [counterpartyId, setCounterpartyId] = useState<string>(
    initialData?.counterpartyId || "",
  );
  const [comment, setComment] = useState(initialData?.comment || "");
  const [items, setItems] = useState<OrderItem[]>(
    Array.isArray(initialData?.items) ? initialData.items : [],
  );
  const [warehouseId, setWarehouseId] = useState<string>(
    (initialData as any)?.warehouseId || "", // Type cast for realization type duck-typing
  );

  // UI State
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [selectedProductForQty, setSelectedProductForQty] =
    useState<Product | null>(null);

  // Combobox State
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // Update form when initialData changes (for Edit mode)
  // Update form when initialData changes (for Edit mode)
  // Update form when initialData changes (for Edit mode)
  // Update form when initialData or products changes (to enrich items)
  useEffect(() => {
    if (initialData) {
      try {
        // Safe date parsing
        let dateStr = new Date().toISOString().split("T")[0];
        if (initialData.date) {
          const d = new Date(initialData.date);
          if (!isNaN(d.getTime())) {
            dateStr = d.toISOString().split("T")[0];
          }
        }
        setDate(dateStr);

        setStatus(initialData.status || OrderStatus.NEW);
        setCounterpartyId(initialData.counterpartyId || "");
        setComment(initialData.comment || "");

        // Safe items parsing with enrichment
        const rawItems = Array.isArray(initialData.items)
          ? initialData.items
          : [];
        const safeItems = rawItems.map((item: any) => {
          const productId = item.productId || item.id; // Fallback
          let productName = item.productName || item.name || "";

          // Try to find name in products list if missing
          if (!productName && products.length > 0 && productId) {
            const foundProduct = products.find((p) => p.id === productId);
            if (foundProduct) productName = foundProduct.name;
          }

          return {
            ...item,
            productId,
            productName,
            quantity: Number(item.quantity ?? item.count ?? 0),
            price: Number(item.price ?? 0),
            total:
              Number(item.total ?? 0) ||
              Number(item.quantity ?? item.count ?? 0) *
                Number(item.price ?? 0) ||
              0,
          };
        });
        setItems(safeItems);
      } catch (e) {
        console.error("Error setting initial data", e);
      }
    }
  }, [initialData, products]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cpData, productsData, priceTypesData] = await Promise.all([
        CounterpartyService.getAll(),
        ProductsService.fetchProducts(),
        PriceTypesService.fetchPriceTypes(),
      ]);
      setCounterparties(cpData);
      setProducts(productsData.products.filter((p) => !p.isDeleted));
      setPriceTypes(priceTypesData.filter((pt) => !pt.isDeleted));

      if (isRealization) {
        const warehousesData = await OrganizationService.getWarehouses();
        setWarehouses(warehousesData);
      }
    } catch (error) {
      console.error("Failed to load data", error);
      alert(t("common.error", "Failed to load data"));
    } finally {
      setLoading(false);
    }
  };

  // Derived State
  const selectedCounterparty = useMemo(
    () => counterparties.find((c) => String(c.id) === String(counterpartyId)),
    [counterparties, counterpartyId],
  );

  // Auto-set warehouse when counterparty changes, for Realizations
  useEffect(() => {
    if (
      isRealization &&
      selectedCounterparty?.warehouseId &&
      !warehouseId &&
      !initialData
    ) {
      setWarehouseId(selectedCounterparty.warehouseId);
    }
  }, [selectedCounterparty, isRealization, warehouseId, initialData]);

  const filteredCounterparties = useMemo(() => {
    return counterparties.filter((cp) =>
      cp.name.toLowerCase().includes(clientSearchTerm.toLowerCase()),
    );
  }, [counterparties, clientSearchTerm]);

  const currency = useMemo(() => {
    if (!selectedCounterparty?.priceTypeId) return "UAH";
    const pt = priceTypes.find(
      (p) => p.id === selectedCounterparty.priceTypeId,
    );
    return pt?.currency || "UAH";
  }, [selectedCounterparty, priceTypes]);

  useEffect(() => {
    const fetchStock = async () => {
      // Use explicit warehouseId if it's a realization, otherwise fallback to counterparty's warehouse.
      const activeWarehouseId = isRealization
        ? warehouseId
        : selectedCounterparty?.warehouseId;
      if (activeWarehouseId) {
        try {
          const balances = await ReportsService.getStockBalances(
            date,
            activeWarehouseId,
          );
          setStockBalances(balances);
        } catch (e) {
          console.error("Failed to load stock balances for autocomplete", e);
        }
      } else {
        setStockBalances([]);
      }
    };
    fetchStock();
  }, [warehouseId, selectedCounterparty?.warehouseId, date, isRealization]);

  const priceSlug = useMemo(() => {
    if (!selectedCounterparty?.priceTypeId) {
      return "standard";
    }

    // Ensure ID comparison is safe (string vs string)
    const pt = priceTypes.find(
      (p) => String(p.id) === String(selectedCounterparty.priceTypeId),
    );
    return pt?.slug || "standard";
  }, [selectedCounterparty, priceTypes]);

  const totalAmount = useMemo(
    () =>
      (items || []).reduce((sum, item) => sum + (Number(item?.total) || 0), 0),
    [items],
  );

  // Handlers
  const handleAddProduct = (product: Product) => {
    // Open Quantity Modal instead of adding 1 automatically
    setSelectedProductForQty(product);
  };

  const handleConfirmQuantity = (
    product: Product,
    quantity: number,
    price: number,
  ) => {
    setItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (item) => item.productId === product.id,
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        return prev.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + quantity;
            return {
              ...item,
              quantity: newQuantity,
              total: Number((newQuantity * price).toFixed(2)),
              // Optionally update price to the newly confirmed price if it differs
              price: price,
            };
          }
          return item;
        });
      } else {
        // Add new item
        const newItem: OrderItem = {
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          quantity,
          price,
          unit: product.unit,
          total: Number((price * quantity).toFixed(2)),
        };
        return [...prev, newItem];
      }
    });

    setSelectedProductForQty(null);
    setIsProductSelectorOpen(false); // Close product selector too
  };

  const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updatedItem = { ...item, ...updates };
        // Recalculate total if quantity or price changed
        if (updates.quantity !== undefined || updates.price !== undefined) {
          updatedItem.total = updatedItem.quantity * updatedItem.price;
        }
        return updatedItem;
      }),
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const selectCounterparty = (newClientId: string) => {
    console.log("OrderForm: Client changed to", newClientId);
    setCounterpartyId(newClientId);
    setIsClientDropdownOpen(false);
    setClientSearchTerm("");

    if (!newClientId) return;

    const client = counterparties.find((c) => c.id === newClientId);
    const pt = priceTypes.find(
      (p) => String(p.id) === String(client?.priceTypeId),
    );
    const newSlug = pt?.slug || "standard";

    console.log(
      "OrderForm: New Price Type Slug:",
      newSlug,
      "Client:",
      client,
      "PT Object:",
      pt,
    );

    if (items.length === 0) return;

    setItems((prevItems) =>
      prevItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          console.warn("OrderForm: Product not found for item", item);
          return item;
        }

        let newPrice = 0;
        // Check specific price type first, then standard, then price property fallback
        if (product.prices && product.prices[newSlug] !== undefined) {
          newPrice = Number(product.prices[newSlug]);
        } else if (product.prices && product.prices["standard"] !== undefined) {
          newPrice = Number(product.prices["standard"]);
        } else if ((product as any).price) {
          newPrice = Number((product as any).price);
        }

        console.log(
          `OrderForm: Updating item ${product.name} price to ${newPrice} (${newSlug})`,
        );

        return {
          ...item,
          price: newPrice,
          total: Number((newPrice * item.quantity).toFixed(2)),
        };
      }),
    );
  };

  const handleUpdatePrices = () => {
    if (!counterpartyId) return;
    if (items.length === 0) return;

    if (
      !window.confirm(
        t(
          "order.confirmUpdatePrices",
          "Оновити ціни всіх товарів згідно з поточним прайсом клієнта?",
        ),
      )
    ) {
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return item;

        let newPrice = 0;
        if (product.prices && product.prices[priceSlug] !== undefined) {
          newPrice = Number(product.prices[priceSlug]);
        } else if (product.prices && product.prices["standard"] !== undefined) {
          newPrice = Number(product.prices["standard"]);
        } else if ((product as any).price) {
          newPrice = Number((product as any).price);
        }

        return {
          ...item,
          price: newPrice,
          total: Number((newPrice * item.quantity).toFixed(2)),
        };
      }),
    );
  };

  const handleSave = async (action: "save" | "saveAndPost" = "save") => {
    console.log("OrderForm: handleSave called");

    if (!counterpartyId) {
      alert(t("order.selectClient", "Please select a client"));
      return;
    }
    if (isRealization && !warehouseId) {
      alert(t("order.selectWarehouse", "Будь ласка, оберіть склад"));
      return;
    }
    if (items.length === 0) {
      if (
        !window.confirm(
          t("order.saveEmpty", "Order has no items. Save anyway?"),
        )
      ) {
        return;
      }
    }

    const orderData: any = {
      // Ensure date is a valid full ISO string
      date: new Date(date).toISOString(),
      counterpartyId,
      status,
      items,
      comment,
      amount: totalAmount,
      currency,
    };

    if (isRealization) {
      orderData.warehouseId = warehouseId;
    }

    console.log("OrderForm: Saving order data:", orderData);

    try {
      await onSubmit(orderData, action);
    } catch (err) {
      console.error("OrderForm: onSubmit failed", err);
      // Re-throw or handle? onSubmit in parent (OrderCreate) catches checking there.
      throw err;
    }
  };

  if (loading && !initialData && !counterparties.length)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );

  return (
    <div className="max-w-4xl mx-auto p-0 sm:p-2 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-0 mt-4 sm:mt-0">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/orders")}
            className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isRealization && (
            <button
              onClick={() => handleSave("saveAndPost")}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="mr-2" size={18} />
              {saving ? t("common.saving", "Saving...") : "Зберегти і провести"}
            </button>
          )}
          <button
            onClick={() => handleSave("save")}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="mr-2" size={18} />
            {saving
              ? t("common.saving", "Saving...")
              : t("common.save", "Save")}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-none sm:rounded-lg p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 border-y sm:border-y-0 border-gray-200 dark:border-gray-700">
        {/* Top Form: Client, Date, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Client */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("menu.counterparties", "Counterparty")}
            </label>

            <div
              className="relative w-full rounded-md border border-gray-300 shadow-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer"
              onClick={() => setIsClientDropdownOpen(true)}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span
                  className={
                    counterpartyId
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400"
                  }
                >
                  {selectedCounterparty
                    ? selectedCounterparty.name
                    : t("action.selectClient", "Select Client")}
                </span>
                <ChevronDown size={18} className="text-gray-400" />
              </div>
            </div>

            {isClientDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsClientDropdownOpen(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 top-full left-0">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                      <input
                        type="text"
                        autoFocus
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        placeholder="Пошук клієнта..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-900 border-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredCounterparties.map((cp) => (
                      <div
                        key={cp.id}
                        onClick={() => selectCounterparty(cp.id)}
                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          String(cp.id) === String(counterpartyId)
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 font-medium"
                            : "text-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {cp.name}
                      </div>
                    ))}
                    {filteredCounterparties.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        Клієнтів не знайдено
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("common.date", "Date")}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col flex-1 pl-4 md:pl-0 sm:pr-4 md:pr-0 border-l border-gray-200 dark:border-gray-700 md:border-none min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ml-2">
              {t("common.status", "Status")}
            </label>
            <select
              title="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-2 pr-6 py-2 appearance-none bg-transparent font-medium"
            >
              {Object.values(OrderStatus).map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`, s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Realization Settings (Warehouse) */}
        {isRealization && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("common.warehouse", "Склад")}
              </label>
              <select
                aria-label="Склад"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 p-2"
              >
                <option value="">
                  {t("warehouse.select", "Оберіть склад")}
                </option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Items Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("common.items", "Items")}
            </h3>
            <button
              onClick={() => setIsProductSelectorOpen(true)}
              className="flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
            >
              <Plus size={16} className="mr-1" />
              {t("action.addProduct", "Add Product")}
            </button>
          </div>

          <OrderItemsTable
            items={items}
            currency={currency}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* Comment & Total */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("common.comment", "Comment")}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div></div>
          <div className="flex flex-col justify-end items-end space-y-2">
            <button
              onClick={handleUpdatePrices}
              className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t("order.updatePricesButton", "🔄 Оновити ціни")}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("common.total", "Total Amount")}
            </span>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {(totalAmount || 0).toFixed(2)}{" "}
              <span className="text-xl font-normal text-gray-500">
                {currency}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        products={products}
        onSelect={handleAddProduct}
        priceSlug={priceSlug}
        stockBalances={stockBalances}
      />

      <QuantityModal
        isOpen={selectedProductForQty !== null}
        onClose={() => setSelectedProductForQty(null)}
        product={selectedProductForQty}
        price={
          selectedProductForQty
            ? Number(
                selectedProductForQty.prices?.[priceSlug] ||
                  selectedProductForQty.prices?.standard ||
                  0,
              )
            : 0
        }
        stockBalance={(() => {
          if (!selectedProductForQty) return null;
          const found = stockBalances.find(
            (sb) => sb.productId === selectedProductForQty.id,
          );
          return found !== undefined ? Number(found.balance) : null;
        })()}
        onConfirm={handleConfirmQuantity}
      />
    </div>
  );
}
