"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";
import { masterLogin, masterLogout, onAuthChange } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Listen for auth changes (includes initial state)
    const unsubscribe = onAuthChange((user) => {
      setState({ user, loading: false, error: null });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { user, error } = await masterLogin(email, password);

      if (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error,
        }));
        return { success: false, error };
      }

      setState({ user, loading: false, error: null });
      return { success: true, data: { user } };
    } catch {
      const errorMessage = "로그인 중 오류가 발생했습니다";
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { success, error: logoutError } = await masterLogout();

      if (!success) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: logoutError || "로그아웃 실패",
        }));
        return { success: false, error: logoutError };
      }

      setState({ user: null, loading: false, error: null });
      return { success: true };
    } catch {
      const errorMessage = "로그아웃 중 오류가 발생했습니다";
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  };
}
