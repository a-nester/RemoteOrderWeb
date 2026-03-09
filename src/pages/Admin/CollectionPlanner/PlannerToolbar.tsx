import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react";
import { collectionService } from "../../../services/collection.service";

interface Props {
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
  onAddClient: () => void;
}

export default function PlannerToolbar({
  currentWeekStart,
  onWeekChange,
  onAddClient,
}: Props) {
  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    onWeekChange(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    onWeekChange(d);
  };

  const handleToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    onWeekChange(d);
  };

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const generatePickingList = async () => {
    // A simple interactive prompt to pick which day, defaulting to today
    const todayStr = new Date().toISOString().split("T")[0];
    const targetDate = window.prompt(
      "Enter date for picking list (YYYY-MM-DD):",
      todayStr,
    );

    if (!targetDate) return;

    try {
      const items = await collectionService.getPickingList(targetDate);
      if (items.length === 0) {
        alert("No items scheduled for picking on this date.");
        return;
      }

      // Open in a new window to print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const html = `
          <html>
            <head>
              <title>Picking List - ${targetDate}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; }
                .header { display: flex; justify-content: space-between; align-items: center; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>Picking List</h2>
                <h3>Date: ${targetDate}</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>To Pick Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.product_name}</td>
                      <td>${item.sku || "-"}</td>
                      <td><strong>${item.total_quantity}</strong></td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
              <script>
                window.onload = () => window.print();
              </script>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Failed to generate picking list", error);
      alert("Failed to generate picking list.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Collection Planner
        </h2>

        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-1">
          <button
            onClick={handlePrevWeek}
            className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium hover:bg-white dark:hover:bg-gray-600 rounded"
          >
            {formatDateLabel(currentWeekStart)} - {formatDateLabel(weekEnd)}
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={generatePickingList}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          Picking List
        </button>

        <button
          onClick={onAddClient}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus size={16} />
          Assign Client
        </button>
      </div>
    </div>
  );
}
