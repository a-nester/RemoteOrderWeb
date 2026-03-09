import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CollectionItem } from "../../../services/collection.service";
import {
  GripVertical,
  CheckCircle2,
  Clock,
  CircleAlert,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  item: CollectionItem;
  isOverlay?: boolean;
  onStatusChange?: (status: CollectionItem["status"]) => void;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function ClientCard({
  item,
  isOverlay,
  onStatusChange,
  onClick,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: CollectionItem["status"]) => {
    switch (status) {
      case "planned":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      case "done":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    }
  };

  const getStatusIcon = (status: CollectionItem["status"]) => {
    switch (status) {
      case "planned":
        return <CircleAlert size={14} />;
      case "in_progress":
        return <Clock size={14} />;
      case "done":
        return <CheckCircle2 size={14} />;
    }
  };

  const handleStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;

    if (item.status === "planned") onStatusChange("in_progress");
    else if (item.status === "in_progress") onStatusChange("done");
    else onStatusChange("planned");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-white dark:bg-gray-800 border ${isOverlay ? "border-indigo-500 shadow-xl scale-105" : "border-gray-200 dark:border-gray-700 shadow-sm"} rounded p-2 flex items-center gap-2 transition-shadow hover:shadow-md cursor-pointer w-full group-hover:border-indigo-300 dark:group-hover:border-indigo-700`}
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-gray-400 shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-none"
        onClick={(e) => {
          // Prevent the drag handle click from opening the modal
          e.stopPropagation();
        }}
      >
        <GripVertical size={16} />
      </div>

      <h4
        className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate"
        title={item.client_name}
      >
        {item.client_name}
      </h4>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap"
          title={t("menu.orders") + " / " + t("menu.products")}
        >
          {item.order_count || 0}/{item.product_count || 0}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (handleStatusCycle) handleStatusCycle(e);
          }}
          className={`flex items-center p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(item.status)}`}
          title={t(`planner.status.${item.status}`)}
        >
          {getStatusIcon(item.status)}
        </button>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
            title={t("common.delete")}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
