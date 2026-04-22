import { X, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  errorMessage: string | null;
  errorDetails?: any;
}

export function ErrorModal({ isOpen, onClose, title, errorMessage, errorDetails }: ErrorModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Extract friendly text if the error message is stringified JSON
  let displayMessage = errorMessage;
  let detailString = "";

  if (errorMessage) {
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed.message) {
        displayMessage = parsed.message;
      }
      if (parsed.code === "INSUFFICIENT_STOCK") {
        displayMessage = t("error.insufficientStock", "Недостатньо товарів на складі для проведення документа.");
        detailString = `Деталі: ${parsed.details || ""}`;
      }
    } catch (e) {
      // not json, leave as is
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/30">
          <div className="flex items-center text-red-600 dark:text-red-400">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <h3 className="text-lg font-medium">
              {title || t("common.error", "Помилка")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-800 dark:text-gray-200 text-base mb-4">
            {displayMessage || t("common.unknownError", "Виникла невідома помилка.")}
          </p>
          
          {detailString && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">
              {detailString}
            </p>
          )}

          {errorDetails && (
            <pre className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
              {typeof errorDetails === "object" ? JSON.stringify(errorDetails, null, 2) : errorDetails}
            </pre>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            {t("common.close", "Закрити")}
          </button>
        </div>
      </div>
    </div>
  );
}
