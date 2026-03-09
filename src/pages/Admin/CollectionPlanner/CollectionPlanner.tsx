import { useState, useEffect } from "react";
// We use a basic date formatter here since date-fns might not be installed,
// assuming standard JS Date methods or basic imports. Wait, checking standard imports...
// Let's use simple JS Date math to avoid dependency issues if date-fns is missing.
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { CollectionItem } from "../../../services/collection.service";
import { collectionService } from "../../../services/collection.service";
import PlannerToolbar from "./PlannerToolbar";
import DayColumn from "./DayColumn";
import ClientCard from "./ClientCard";
import AddClientModal from "./AddClientModal";

// Helper to get Monday of the current week
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper to format Date to YYYY-MM-DD
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CollectionPlanner() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getStartOfWeek(new Date()),
  );
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts to allow clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchSchedule = async () => {
    try {
      const fromStr = formatDate(weekDays[0]);
      const toStr = formatDate(weekDays[6]);
      const data = await collectionService.getSchedule(fromStr, toStr);
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch schedule", error);
    }
  };

  useEffect(() => {
    fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = items.some((task) => task.id === activeId);
    const isOverTask = items.some((task) => task.id === overId);
    const isOverColumn =
      typeof overId === "string" && overId.startsWith("day-");

    if (!isActiveTask) return;

    // Task over Task
    if (isActiveTask && isOverTask) {
      setItems((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);

        if (prev[activeIndex].date !== prev[overIndex].date) {
          const newItems = [...prev];
          newItems[activeIndex].date = prev[overIndex].date;
          return arrayMove(newItems, activeIndex, overIndex);
        }

        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Task over Column
    if (isActiveTask && isOverColumn) {
      setItems((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const newDate = (overId as string).replace("day-", "");

        if (prev[activeIndex].date !== newDate) {
          const newItems = [...prev];
          newItems[activeIndex].date = newDate;
          return newItems;
        }
        return prev;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeItem = items.find((i) => i.id === active.id);
    const overId = over.id;

    let targetDate = activeItem?.date;

    if (typeof overId === "string" && overId.startsWith("day-")) {
      targetDate = overId.replace("day-", "");
    } else {
      const overItem = items.find((i) => i.id === overId);
      if (overItem) targetDate = overItem.date;
    }

    if (activeItem && targetDate && activeItem.date !== targetDate) {
      try {
        await collectionService.updateDate(activeItem.id, targetDate);
        // Date is already optimistically updated in handleDragOver
      } catch (error) {
        console.error("Failed to update date on server", error);
        fetchSchedule(); // Revert on failure
      }
    }
  };

  const activeItem = items.find((i) => i.id === activeId);

  return (
    <div className="flex flex-col h-full space-y-4">
      <PlannerToolbar
        currentWeekStart={currentWeekStart}
        onWeekChange={setCurrentWeekStart}
        onAddClient={() => setIsModalOpen(true)}
      />

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-h-[500px]">
            {weekDays.map((date) => {
              const dateStr = formatDate(date);
              const dayItems = items.filter((i) => i.date === dateStr);

              return (
                <DayColumn
                  key={dateStr}
                  date={date}
                  dateStr={dateStr}
                  items={dayItems}
                  onStatusChange={(
                    id: number,
                    status: CollectionItem["status"],
                  ) => {
                    collectionService
                      .updateStatus(id, status)
                      .catch(console.error);
                    setItems((prev) =>
                      prev.map((item) =>
                        item.id === id ? { ...item, status } : item,
                      ),
                    );
                  }}
                  onDelete={(id: number) => {
                    if (window.confirm("Remove client from this day?")) {
                      collectionService
                        .deleteScheduleItem(id)
                        .catch(console.error);
                      setItems((prev) => prev.filter((item) => item.id !== id));
                    }
                  }}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeItem ? <ClientCard item={activeItem} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={async (clientId: string, dateStr: string) => {
          try {
            const newItem = await collectionService.addScheduleItem(
              dateStr,
              clientId,
            );
            setItems((prev) => [...prev, newItem]);
            setIsModalOpen(false);
          } catch (error) {
            console.error("Failed to add client", error);
            alert("Failed to assign client");
          }
        }}
        preselectedDate={formatDate(new Date())}
      />
    </div>
  );
}
