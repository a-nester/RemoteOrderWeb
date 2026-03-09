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
  dayOfWeek: number;
  dayLabel: string;
  items: CollectionItem[];
  onStatusChange: (id: number, status: CollectionItem["status"]) => void;
  onDelete: (id: number) => void;
}

export default function DayColumn({
  dayOfWeek,
  dayLabel,
  items,
  onStatusChange,
  onDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayOfWeek}`,
  });

  const [summary, setSummary] = useState({ clients: 0, orders: 0, items: 0 });

  useEffect(() => {
    collectionService
      .getDaySummary(dayOfWeek)
      .then((data) => {
        setSummary({
          clients: data.client_count || 0,
          orders: data.order_count || 0,
          items: data.item_count || 0,
        });
      })
      .catch(console.error);
  }, [dayOfWeek, items.length]); // Re-fetch summary when items count changes

  const isToday = new Date().getDay() === (dayOfWeek === 7 ? 0 : dayOfWeek);

  return (
    <div
      className={`flex flex-col flex-1 min-w-[280px] bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden border ${isToday ? "border-indigo-500 shadow-md" : "border-gray-200 dark:border-gray-700"}`}
    >
      <div
        className={`p-3 border-b border-gray-200 dark:border-gray-700 ${isToday ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-white dark:bg-gray-800"}`}
      >
        <div className="flex items-center justify-between rtl">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {dayLabel}
          </h3>
          {isToday && (
            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full">
              Today
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {items.length} client{items.length !== 1 ? "s" : ""}
        </p>

        {/* Workload Indicators */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
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
