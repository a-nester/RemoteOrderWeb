import { useAuthStore } from "../store/auth.store";
import { LogOut } from "lucide-react";

export default function Dashboard() {
    const { user, logout } = useAuthStore();

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-800">RemoteOrder Web</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">
                                {user?.email} ({user?.role})
                            </span>
                            <button
                                onClick={() => logout()}
                                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                        <p className="text-gray-500 text-xl">
                            Welcome to the {user?.role} dashboard!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
