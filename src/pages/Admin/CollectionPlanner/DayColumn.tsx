import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { CollectionItem } from "../../../services/collection.service";
import { collectionService } from "../../../services/collection.service";
import ClientCard from "./ClientCard";
import { useEffect, useState } from "react";

interface Props {
  date: Date;
  dateStr: string;
  items: CollectionItem[];
  onStatusChange: (id: number, status: CollectionItem["status"]) => void;
  onDelete: (id: number) => void;
}

export default function DayColumn({
  date,
  dateStr,
  items,
  onStatusChange,
  onDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
  });

  const [summary, setSummary] = useState({ clients: 0, orders: 0, items: 0 });

  useEffect(() => {
    collectionService
      .getDaySummary(dateStr)
      .then((data) => {
        setSummary({
          clients: data.client_count || 0,
          orders: data.order_count || 0,
          items: data.item_count || 0,
        });
      })
      .catch(console.error);
  }, [dateStr, items.length]); // Re-fetch summary when items count changes

  const isToday = new Date().toISOString().split("T")[0] === dateStr;
  const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
  const dayNumber = date.getDate();

  return (
    <div
      className={`flex flex-col flex-1 min-w-[280px] bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden border ${isToday ? "border-indigo-500 shadow-md" : "border-gray-200 dark:border-gray-700"}`}
    >
      <div
        className={`p-3 border-b border-gray-200 dark:border-gray-700 ${isToday ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-white dark:bg-gray-800"}`}
      >
        <div className="flex justify-between items-center mb-2">
          <span
            className={`font-semibold ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}
          >
            {dayName}
          </span>
          <span
            className={`text-lg font-bold ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-gray-900 dark:text-white"}`}
          >
            {dayNumber}
          </span>
        </div>

        {/* Workload Indicators */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{summary.clients} cl</span>
          <span>{summary.orders} ord</span>
          <span>{summary.items} itm</span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 p-2 overflow-y-auto space-y-2 transition-colors ${isOver ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""}`}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <ClientCard
              key={item.id}
              item={item}
              onStatusChange={(status: CollectionItem["status"]) =>
                onStatusChange(item.id, status)
              }
              onDelete={() => onDelete(item.id)}
            />
          ))}
          {items.length === 0 && (
            <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 text-sm">
              Drop here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
