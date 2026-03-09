import React from "react";
import { useTranslation } from "react-i18next";
import type { Order } from "../../types/order";
import { OrderStatus } from "../../types/order";
import { Edit, Eye, ArrowUp, ArrowDown } from "lucide-react";
import DocumentActionsDropdown from "../../components/DocumentActionsDropdown";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";

interface OrderListProps {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete?: (order: Order) => void;
  onView?: (order: Order) => void;
  onStatusChange?: (id: string, status: OrderStatus) => void;
}

const OrderList: React.FC<OrderListProps> = ({
  orders,
  onEdit,
  onDelete,
  onView,
  onStatusChange,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [highlightId, setHighlightId] = useState<string | null>(
    location.state?.highlight || null,
  );

  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`row-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      const timer = setTimeout(() => {
        setHighlightId(null);
        // Clear history state to prevent re-highlighting on reload
        window.history.replaceState({}, document.title);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, orders]); // add orders to guarantee it triggers after render if data arrives late

  const { user, setPreferences } = useAuthStore();
  const defaultSort = user?.preferences?.orderSort || "desc"; // Match initial requirement descending
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSort);

  const toggleSort = async () => {
    const newSort = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newSort);

    // Save to server
    const newPrefs = { ...user?.preferences, orderSort: newSort };
    setPreferences(newPrefs);
    await AuthService.updatePreferences(newPrefs);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.NEW:
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case OrderStatus.ACCEPTED:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case OrderStatus.COMPLETED:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th
              className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={toggleSort}
            >
              <div className="flex items-center gap-2">
                {t("common.date", "Date")}
                {sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowUp size={14} />
                )}
              </div>
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("common.status", "Status")}
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("menu.counterparties", "Counterparties")}
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("common.sum", "Sum")}
            </th>
            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("common.number", "Номер")}
            </th>
            <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("common.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {orders.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
              >
                {t("common.noData", "No orders found")}
              </td>
            </tr>
          ) : (
            [...orders]
              .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
              })
              .map((order) => {
                const isHighlighted = order.id === highlightId;
                return (
                  <tr
                    id={`row-${order.id}`}
                    key={order.id}
                    onClick={() => onView && onView(order)}
                    className={`cursor-pointer ${
                      isHighlighted
                        ? "bg-green-100 dark:bg-green-900/40 transition-colors duration-1000"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td
                      className="px-6 py-1 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={order.status}
                        onChange={(e) =>
                          onStatusChange &&
                          onStatusChange(
                            order.id,
                            e.target.value as OrderStatus,
                          )
                        }
                        disabled={!onStatusChange}
                        className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full border outline-none appearance-none cursor-pointer pr-6 w-[100px] md:w-auto truncate ${getStatusColor(order.status)}`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: "right 0.25rem center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "1.25em 1.25em",
                        }}
                      >
                        {Object.values(OrderStatus).map((status) => (
                          <option key={status} value={status}>
                            {t(`status.${status}`, status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.counterpartyName}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.amount.toFixed(2)} {order.currency}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      {order.docNumber || order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(order);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title={t("common.view", "View")}
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(order);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title={t("common.edit", "Edit")}
                        >
                          <Edit size={18} />
                        </button>

                        <DocumentActionsDropdown
                          isPosted={["ACCEPTED", "COMPLETED"].includes(
                            order.status,
                          )}
                          paymentUrl={`/finance/transactions?action=payment&counterpartyId=${order.counterpartyId || ""}&amount=${order.amount}`}
                          copyUrl={`/orders/create?copyFrom=${order.id}`}
                          onToggleStatus={() => {
                            if (onStatusChange) {
                              onStatusChange(
                                order.id,
                                ["ACCEPTED", "COMPLETED"].includes(order.status)
                                  ? OrderStatus.NEW
                                  : OrderStatus.ACCEPTED,
                              );
                            }
                          }}
                          onDelete={() => onDelete && onDelete(order)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrderList;
