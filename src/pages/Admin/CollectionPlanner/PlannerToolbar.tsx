import { Download, Plus } from "lucide-react";
import { collectionService } from "../../../services/collection.service";
import { useTranslation } from "react-i18next";

interface Props {
  onAddClient: () => void;
}

export default function PlannerToolbar({ onAddClient }: Props) {
  const { t } = useTranslation();

  const generatePickingList = async () => {
    // A simple interactive prompt to pick which day, defaulting to today
    let d = new Date().getDay();
    if (d === 0) d = 7; // Convert Sunday 0 -> 7
    const targetDay = parseInt(
      window.prompt(t("planner.selectDay") + " (1-7):", d.toString()) || "",
    );

    if (!targetDay || isNaN(targetDay) || targetDay < 1 || targetDay > 7) {
      if (targetDay) alert(t("common.error"));
      return;
    }

    try {
      const items = await collectionService.getPickingList(targetDay);
      if (items.length === 0) {
        alert(t("common.noData"));
        return;
      }

      // 1. Generate Print Layout
      const dayNames = [
        "",
        t("planner.days.1"),
        t("planner.days.2"),
        t("planner.days.3"),
        t("planner.days.4"),
        t("planner.days.5"),
        t("planner.days.6"),
        t("planner.days.7"),
      ];
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const html = `
          <html>
            <head>
              <title>${t("planner.printTitle")} - ${dayNames[targetDay]}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { font-size: 24px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .qty { font-weight: bold; font-size: 1.1em; text-align: center; }
              </style>
            </head>
            <body>
              <h1>${t("planner.printTitle")}: ${dayNames[targetDay]}</h1>
              <p>${t("common.date")}: ${new Date().toLocaleString()}</p>
              <table>
                <thead>
                  <tr>
                    <th>${t("common.product")}</th>
                    <th>SKU</th>
                    <th>${t("common.quantity")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.product_name}</td>
                      <td>${item.sku || "-"}</td>
                      <td class="qty">${item.total_quantity}</td>
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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t("planner.title")}
        </h2>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          onClick={generatePickingList}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm"
        >
          <Download className="w-4 h-4" />
          {t("planner.printTitle")}
        </button>

        <button
          onClick={onAddClient}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          {t("planner.assignClient")}
        </button>
      </div>
    </div>
  );
}
