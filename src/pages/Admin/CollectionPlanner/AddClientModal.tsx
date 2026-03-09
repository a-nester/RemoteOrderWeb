import { useState, useEffect } from "react";
import { CounterpartyService } from "../../../services/counterparty.service";
import type { Counterparty } from "../../../types/counterparty";
import { X, Search } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (clientId: string, dayOfWeek: number) => void;
  preselectedDay?: number;
}

export default function AddClientModal({
  isOpen,
  onClose,
  onAdd,
  preselectedDay = 1,
}: Props) {
  const [clients, setClients] = useState<Counterparty[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [dayOfWeek, setDayOfWeek] = useState(preselectedDay);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      setDayOfWeek(preselectedDay);
      setSearch("");
      setSelectedClient("");
    }
  }, [isOpen, preselectedDay]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await CounterpartyService.getAll();
      setClients(data);
    } catch (error) {
      console.error("Failed to load clients", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = search
    ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !dayOfWeek) return;
    onAdd(selectedClient, dayOfWeek);
    setSelectedClient("");
    setSearch("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="relative z-100 inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Assign Client to Schedule
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Day Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Day of Week
                  </label>
                  <select
                    required
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm p-2 bg-transparent border"
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={7}>Sunday</option>
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Client
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Type client name..."
                      className="block w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm p-2 bg-transparent border"
                    />
                  </div>
                </div>

                {/* Client Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Client
                  </label>
                  <div className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white overflow-hidden">
                    <div className="h-48 overflow-y-auto w-full flex flex-col">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClient(c.id)}
                          className={`w-full text-left px-3 py-2 text-sm focus:outline-none transition-colors border-b border-gray-100 dark:border-gray-600 last:border-0 ${
                            selectedClient === c.id
                              ? "bg-indigo-600 text-white"
                              : "hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                      {filteredClients.length === 0 && (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          No clients found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={!selectedClient || loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Assign
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
