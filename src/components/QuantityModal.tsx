import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Check } from "lucide-react";
import type { Product } from "../types/product";

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  price: number;
  stockBalance: number | null;
  onConfirm: (product: Product, quantity: number, price: number) => void;
}

export default function QuantityModal({
  isOpen,
  onClose,
  product,
  price,
  stockBalance,
  onConfirm,
}: QuantityModalProps) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState<number | string>(1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset quantity and focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      // Timeout ensures the element is rendered in DOM before focus
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select(); // Select the text to easily overwrite '1'
      }, 50);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const parsedQuantity = Number(quantity) || 0;
  const total = parsedQuantity * price;

  const handleConfirm = () => {
    if (parsedQuantity > 0) {
      onConfirm(product, parsedQuantity, price);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4">
            {product.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Information block */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">
                {t("common.price", "Price")}
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {price.toFixed(2)} ₴
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Залишок</p>
              <p
                className={`font-semibold ${stockBalance === 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}
              >
                {stockBalance !== null ? stockBalance.toFixed(2) : "-"}{" "}
                {product.unit}
              </p>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("common.quantity", "Quantity")} ({product.unit})
            </label>
            <div className="flex items-center">
              <button
                onClick={() => setQuantity(Math.max(1, parsedQuantity - 1))}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-l-lg text-gray-800 dark:text-white text-xl font-medium transition-colors border border-gray-300 dark:border-gray-600 border-r-0"
              >
                -
              </button>
              <input
                ref={inputRef}
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                className="flex-1 h-12 text-center text-lg font-bold border-y border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-0 focus:outline-none"
              />
              <button
                onClick={() => setQuantity(parsedQuantity + 1)}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-r-lg text-gray-800 dark:text-white text-xl font-medium transition-colors border border-gray-300 dark:border-gray-600 border-l-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-end pt-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {t("common.total", "Total Amount")}
            </span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {total.toFixed(2)}{" "}
              <span className="text-sm font-normal text-gray-500">₴</span>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={parsedQuantity <= 0}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <Check size={20} className="mr-2" />
            {t("action.add", "Add")}
          </button>
        </div>
      </div>
    </div>
  );
}
