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

interface Props {
  item: CollectionItem;
  isOverlay?: boolean;
  onStatusChange?: (status: CollectionItem["status"]) => void;
  onDelete?: () => void;
}

export default function ClientCard({
  item,
  isOverlay,
  onStatusChange,
  onDelete,
}: Props) {
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
        return <CircleAlert size={14} className="mr-1" />;
      case "in_progress":
        return <Clock size={14} className="mr-1" />;
      case "done":
        return <CheckCircle2 size={14} className="mr-1" />;
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
      className={`relative group bg-white dark:bg-gray-800 border ${isOverlay ? "border-indigo-500 shadow-xl scale-105" : "border-gray-200 dark:border-gray-700 shadow-sm"} rounded-lg p-3 flex flex-col gap-2 transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing`}
      {...attributes}
      {...listeners}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-1 flex-1">
          <GripVertical size={16} className="text-gray-400 mt-0.5 shrink-0" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
            {item.client_name}
          </h4>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex justify-between items-end mt-1 pl-5">
        <button
          onClick={handleStatusCycle}
          className={`flex items-center px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(item.status)}`}
        >
          {getStatusIcon(item.status)}
          <span className="capitalize">{item.status.replace("_", " ")}</span>
        </button>

        <div className="text-right text-xs text-gray-500 dark:text-gray-400 font-medium">
          <div>{item.order_count || 0} ORD</div>
          <div>{item.product_count || 0} ITM</div>
        </div>
      </div>
    </div>
  );
}
