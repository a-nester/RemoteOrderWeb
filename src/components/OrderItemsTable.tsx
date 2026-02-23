import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import type { OrderItem } from "../types/order";

interface OrderItemsTableProps {
  items: OrderItem[];
  currency: string;
  onUpdateItem: (id: string, updates: Partial<OrderItem>) => void;
  onRemoveItem: (id: string) => void;
  readonly?: boolean;
}

const NumberInput = ({
  value,
  min,
  step,
  onChange,
  className,
}: {
  value: number;
  min: string;
  step: string;
  onChange: (val: number) => void;
  className: string;
}) => {
  const [localVal, setLocalVal] = useState(value.toString());

  useEffect(() => {
    // Sync external changes unless the user is actively typing a decimal point
    if (parseFloat(localVal) !== value && !localVal.endsWith(".")) {
      setLocalVal(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  };

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={localVal}
      onChange={handleChange}
      className={className}
    />
  );
};

export default function OrderItemsTable({
  items,
  currency,
  onUpdateItem,
  onRemoveItem,
  readonly = false,
}: OrderItemsTableProps) {
  const { t } = useTranslation();

  const handleQuantityChange = (id: string, quantity: number) => {
    onUpdateItem(id, { quantity });
  };

  const handlePriceChange = (id: string, price: number) => {
    onUpdateItem(id, { price });
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        {t("order.noItems", "No items added yet")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              scope="col"
              className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8 md:w-10"
            >
              #
            </th>
            <th
              scope="col"
              className="px-2 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              {t("common.product", "Product")}
            </th>
            <th
              scope="col"
              className="px-2 py-2 md:px-4 md:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20 md:w-32"
            >
              {t("common.quantity", "Qty")}
            </th>
            <th
              scope="col"
              className="px-2 py-2 md:px-4 md:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20 md:w-32"
            >
              {t("common.price", "Price")}
            </th>
            <th
              scope="col"
              className="px-2 py-2 md:px-4 md:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20 md:w-32"
            >
              {t("common.total", "Total")}
            </th>
            {!readonly && (
              <th
                scope="col"
                className="px-2 py-2 md:px-4 md:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10 md:w-16"
              ></th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="px-2 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {index + 1}
              </td>
              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-900 dark:text-white font-medium">
                {item.productName}
                <div className="text-[10px] md:text-xs text-gray-400">
                  {item.unit}
                </div>
              </td>
              <td className="px-2 py-2 md:px-4 md:py-3 whitespace-nowrap text-right text-sm text-gray-500">
                {readonly ? (
                  <span>{item.quantity}</span>
                ) : (
                  <NumberInput
                    min="0"
                    step="0.001"
                    value={item.quantity}
                    onChange={(val) => handleQuantityChange(item.id, val)}
                    className="w-16 md:w-20 text-right rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs md:text-sm px-1 py-1 md:px-2 md:py-2"
                  />
                )}
              </td>
              <td className="px-2 py-2 md:px-4 md:py-3 whitespace-nowrap text-right text-sm text-gray-500">
                {readonly ? (
                  <span>{Number(item.price || 0).toFixed(2)}</span>
                ) : (
                  <NumberInput
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(val) => handlePriceChange(item.id, val)}
                    className="w-16 md:w-20 text-right rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs md:text-sm px-1 py-1 md:px-2 md:py-2"
                  />
                )}
              </td>
              <td className="px-2 py-2 md:px-4 md:py-3 whitespace-nowrap text-right text-xs md:text-sm font-medium text-gray-900 dark:text-white">
                {Number(item.total || 0).toFixed(2)}
              </td>
              {!readonly && (
                <td className="px-1 py-2 md:px-4 md:py-3 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                  >
                    <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <td
              colSpan={4}
              className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white"
            >
              {t("common.total", "Total")}:
            </td>
            <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
              {(items || [])
                .reduce((sum, i) => sum + (Number(i?.total) || 0), 0)
                .toFixed(2)}{" "}
              {currency}
            </td>
            {!readonly && <td></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
