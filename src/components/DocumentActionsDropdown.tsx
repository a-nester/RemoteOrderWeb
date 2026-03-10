import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  CheckCircle,
  XCircle,
  CreditCard,
  Copy,
  Trash2,
} from "lucide-react";

export interface DocumentActionsProps {
  isPosted: boolean;
  paymentUrl: string;
  copyUrl: string;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export default function DocumentActionsDropdown({
  isPosted,
  paymentUrl,
  copyUrl,
  onToggleStatus,
  onDelete,
}: DocumentActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setIsOpen(false);
    action();
  };

  const handlePayment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    window.open(paymentUrl, "_blank");
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    window.open(copyUrl, "_blank");
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 focus:outline-none transition-colors"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-[1000]">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={(e) => handleAction(e, onToggleStatus)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isPosted ? (
                <>
                  <XCircle className="mr-3 h-4 w-4 text-orange-500" />{" "}
                  Розпровести
                </>
              ) : (
                <>
                  <CheckCircle className="mr-3 h-4 w-4 text-green-500" />{" "}
                  Провести
                </>
              )}
            </button>
            <button
              onClick={handlePayment}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <CreditCard className="mr-3 h-4 w-4 text-blue-500" /> Оплата
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="mr-3 h-4 w-4 text-indigo-500" /> Копіювати
            </button>

            <button
              onClick={(e) => handleAction(e, onDelete)}
              disabled={isPosted}
              className={`flex items-center w-full px-4 py-2 text-sm ${
                isPosted
                  ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <Trash2 className="mr-3 h-4 w-4" /> Видалити
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
