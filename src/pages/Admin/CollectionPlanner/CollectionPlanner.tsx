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
import { useTranslation } from "react-i18next";

export default function CollectionPlanner() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const weekDays = [
    { id: 1, label: t("planner.days.1") },
    { id: 2, label: t("planner.days.2") },
    { id: 3, label: t("planner.days.3") },
    { id: 4, label: t("planner.days.4") },
    { id: 5, label: t("planner.days.5") },
    { id: 6, label: t("planner.days.6") },
    { id: 7, label: t("planner.days.7") },
  ];

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

  const fetchSchedule = async () => {
    try {
      const data = await collectionService.getSchedule();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch schedule", error);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

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

        if (prev[activeIndex].dayOfWeek !== prev[overIndex].dayOfWeek) {
          const newItems = [...prev];
          newItems[activeIndex].dayOfWeek = prev[overIndex].dayOfWeek;
          return arrayMove(newItems, activeIndex, overIndex);
        }

        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Task over Column
    if (isActiveTask && isOverColumn) {
      setItems((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const newDay = parseInt((overId as string).replace("day-", ""));

        if (prev[activeIndex].dayOfWeek !== newDay) {
          const newItems = [...prev];
          newItems[activeIndex].dayOfWeek = newDay;
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

    let targetDay = activeItem?.dayOfWeek;

    if (typeof overId === "string" && overId.startsWith("day-")) {
      targetDay = parseInt(overId.replace("day-", ""));
    } else {
      const overItem = items.find((i) => i.id === overId);
      if (overItem) targetDay = overItem.dayOfWeek;
    }

    if (activeItem && targetDay && activeItem.dayOfWeek !== targetDay) {
      try {
        await collectionService.updateDay(activeItem.id, targetDay);
        // Date is already optimistically updated in handleDragOver
      } catch (error) {
        console.error("Failed to update day on server", error);
        fetchSchedule(); // Revert on failure
      }
    }
  };

  const activeItem = items.find((i) => i.id === activeId);

  return (
    <div className="flex flex-col h-full space-y-4">
      <PlannerToolbar onAddClient={() => setIsModalOpen(true)} />

      <div className="flex-1 overflow-x-auto pb-4 snap-x snap-mandatory">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-h-[500px]">
            {weekDays.map((day) => {
              const dayItems = items.filter((i) => i.dayOfWeek === day.id);

              return (
                <DayColumn
                  key={day.id}
                  dayOfWeek={day.id}
                  dayLabel={day.label}
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
                    if (window.confirm(t("common.delete") + "?")) {
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
        onAdd={async (clientId: string, dayOfWeek: number) => {
          try {
            const newItem = await collectionService.addScheduleItem(
              dayOfWeek,
              clientId,
            );
            setItems((prev) => [...prev, newItem]);
            setIsModalOpen(false);
          } catch (error) {
            console.error("Failed to add client", error);
            alert(t("common.error"));
          }
        }}
        preselectedDay={1}
      />
    </div>
  );
}
