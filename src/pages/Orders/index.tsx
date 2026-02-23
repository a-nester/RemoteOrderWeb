import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import type { Order, OrderFilter } from "../../types/order";
import { OrderService } from "../../services/order.service";
import OrderList from "./OrderList";

export default function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadOrders();
  }, [startDate, endDate, searchTerm]); // Reload when filters change

  const loadOrders = async () => {
    setLoading(true);
    try {
      const filter: OrderFilter = {
        startDate,
        endDate,
        search: searchTerm,
      };
      const data = await OrderService.getOrders(filter);
      setOrders(data);
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    navigate("/orders/create");
  };

  const handleDeleteOrder = async (order: Order) => {
    if (
      window.confirm(
        t(
          "common.confirmDelete",
          "Are you sure you want to delete this order?",
        ),
      )
    ) {
      try {
        await OrderService.deleteOrder(order.id);
        loadOrders();
      } catch (error) {
        console.error(error);
        alert(t("common.error", "An error occurred"));
      }
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await OrderService.updateOrder(id, { status: status as any });
      loadOrders();
    } catch (error) {
      console.error("Failed to update status", error);
      alert(t("common.error", "An error occurred"));
    }
  };

  const handleViewOrder = (order: Order) => {
    navigate(`/orders/${order.id}`);
  };

  const handleEditOrder = (order: Order) => {
    navigate(`/orders/${order.id}/edit`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 shadow rounded-lg sticky top-0 z-10 dark:bg-gray-800 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("menu.orders", "Orders")}
        </h1>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Date Filters */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("common.search", "Search...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateOrder}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus size={18} />
            {t("order.create", "New Order")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          {t("common.loading", "Loading...")}
        </div>
      ) : (
        <OrderList
          orders={orders}
          onEdit={handleEditOrder}
          onDelete={handleDeleteOrder}
          onView={handleViewOrder}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
