import { useState, useEffect } from "react";
import { UsersService, type User } from "../../services/users.service";
import { useTranslation } from "react-i18next";
import { Edit, User as UserIcon } from "lucide-react";
import UserFormModal from "./UserFormModal";

export default function UsersList() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await UsersService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    setEditingUser(user || null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (userData: any) => {
    try {
      if (editingUser) {
        await UsersService.updateUser(editingUser.id, userData);
      } else {
        await UsersService.createUser(userData);
      }
      fetchUsers();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save user:", error);
      alert(t("common.error", "Error saving"));
    }
  };

  if (loading)
    return (
      <div className="text-center p-8">{t("common.loading", "Loading...")}</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <UserIcon className="mr-2" size={20} />
          Користувачі
        </h2>
        {/* 
                  Omitting "Add User" for now per requirements, but the hook is there 
                  <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Add User</button>
                */}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email (Login)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Роль
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дії
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {user.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center justify-end w-full"
                  >
                    <Edit size={18} className="mr-1" /> Редагувати
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveUser}
          initialData={editingUser}
        />
      )}
    </div>
  );
}
