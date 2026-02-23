import { useState, useMemo } from "react";
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
}

export default function ProductSelector({
  isOpen,
  onClose,
  products,
  onSelect,
  priceSlug,
  stockBalances = [],
}: ProductSelectorProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(cats)].sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow-xl w-full max-w-4xl h-full sm:h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("product.select", "Select Product")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder={t("common.search", "Search...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {t("common.product", "Product")}
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
                <optgroup
                  key={group.category}
                  label="hack-for-react-key"
                  className="contents"
                >
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
                        <div className="font-medium">{product.name}</div>
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
                </optgroup>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    {t("common.noResults", "No products found")}
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
