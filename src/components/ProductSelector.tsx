import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import type { Product } from "../types/product";
import type { StockBalance } from "../services/reports.service";

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelect: (product: Product) => void;
  priceSlug: string;
  stockBalances?: StockBalance[];
  addedItemsMap?: Record<string, number>;
  allowedCategories?: string[];
}

export default function ProductSelector({
  isOpen,
  onClose,
  products,
  onSelect,
  priceSlug,
  stockBalances = [],
  addedItemsMap = {},
  allowedCategories,
}: ProductSelectorProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    let categoryList = Array.from(cats);
    if (Array.isArray(allowedCategories)) {
      categoryList = categoryList.filter((cat) => allowedCategories.includes(cat));
    }
    return ["All", ...categoryList.sort()];
  }, [products, allowedCategories]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (Array.isArray(allowedCategories) && p.category) {
        if (!allowedCategories.includes(p.category)) {
          return false;
        }
      }
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, allowedCategories]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => {
      const cat = p.category || "Без категорії";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    // Sort keys so they appear in a consistent order
    const sortedKeys = Object.keys(groups).sort();
    return sortedKeys.map((key) => ({ category: key, items: groups[key] }));
  }, [filteredProducts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow-xl w-full max-w-4xl h-full sm:h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("planner.selectProduct", "Підбір товару")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder={t("common.search", "Пошук за назвою...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "Всі категорії" : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t("common.noResults", "Товарів не знайдено")}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Товар
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32"
                  >
                    {t("common.price", "Price")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24"
                  >
                    Залишок
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {groupedProducts.map((group) => (
                  <React.Fragment key={group.category}>
                    {/* Category Header */}
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {group.category}
                      </td>
                    </tr>
                    {/* Category Products */}
                    {group.items.map((product) => (
                      <tr
                        key={product.id}
                        onClick={() => onSelect(product)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          <div className="font-medium flex items-center gap-2">
                            {product.name}
                            {addedItemsMap[product.id] ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                ✓ {addedItemsMap[product.id]}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {product.unit}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {Number(
                            product.prices?.[priceSlug] ||
                              product.prices?.standard ||
                              0,
                          ).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400 text-right">
                          {stockBalances.find((sb) => sb.productId === product.id)
                            ?.balance
                            ? Number(
                                stockBalances.find(
                                  (sb) => sb.productId === product.id,
                                )?.balance,
                              ).toFixed(2)
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
