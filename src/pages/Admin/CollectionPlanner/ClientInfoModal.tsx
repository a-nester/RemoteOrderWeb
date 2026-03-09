import { X, Phone, MapPin, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Counterparty } from "../../../types/counterparty";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: Counterparty | null;
}

export default function ClientInfoModal({ isOpen, onClose, client }: Props) {
  const { t } = useTranslation();

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="relative z-[100] inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-5">
              <h3 className="text-xl leading-6 font-semibold text-gray-900 dark:text-white pr-4">
                {client.name}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 shrink-0"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-3">
              {client.phone && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                      Телефон
                    </div>
                    <a
                      href={`tel:${client.phone}`}
                      className="text-base font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
                    >
                      {client.phone}
                    </a>
                  </div>
                </div>
              )}

              {client.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                      Адреса
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {client.address}
                    </div>
                  </div>
                </div>
              )}

              {client.contactPerson && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                      Контактна особа
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {client.contactPerson}
                    </div>
                  </div>
                </div>
              )}

              {!client.phone && !client.address && !client.contactPerson && (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                  Детальна інформація відсутня
                </div>
              )}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
