import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthService } from "../services/auth.service";

export type Role = "admin" | "manager" | "client";

export type User = {
    id: number;
    email: string;
    role: Role;
    warehouseId?: string;
};

type AuthState = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (email, password) => {
                const result = await AuthService.login(email, password);

                if (result.success && result.user && result.token) {
                    // Set token for axios requests
                    // Ideally we should have an axios interceptor, but for now we can set it via header if we used a global instance
                    // Or just rely on the token being in store and attaching it manually or via interceptor later.

                    set({
                        user: result.user,
                        token: result.token,
                        isAuthenticated: true,
                    });
                    return true;
                }

                return false;
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
            },
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
);
