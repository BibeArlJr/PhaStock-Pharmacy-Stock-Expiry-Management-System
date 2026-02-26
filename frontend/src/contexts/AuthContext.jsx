import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { onUnauthorized } from '@/lib/authEvents';
import api from '@/lib/api';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'phast_user';
const TOKEN_STORAGE_KEY = 'phast_token';

const normalizeUser = (value) => {
  if (!value) {
    return null;
  }

  const pharmacy = value.pharmacy
    ? {
        id: value.pharmacy.id,
        name: value.pharmacy.name,
      }
    : null;

  return {
    id: value.id,
    fullName: value.fullName || value.full_name || '',
    email: value.email || '',
    phone: value.phone || '',
    pharmacy,
  };
};

const getStoredUser = () => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(raw));
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUserState] = useState(() => getStoredUser());
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setTokenState(null);
    setUserState(null);
  };

  const setToken = (nextToken) => {
    if (!nextToken) {
      clearAuth();
      return;
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setTokenState(nextToken);
  };

  const setUser = (nextUser) => {
    const normalized = normalizeUser(nextUser);

    if (!normalized) {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUserState(null);
      return;
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
    setUserState(normalized);
  };

  const logout = () => {
    clearAuth();
  };

  const refreshMe = async () => {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
      clearAuth();
      return null;
    }

    try {
      const response = await api.get('/auth/me');
      const me = normalizeUser(response.data?.data || null);
      setUser(me);
      return me;
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuth();
        return null;
      }

      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const existingToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!existingToken) {
        if (isMounted) {
          setIsAuthLoading(false);
        }
        return;
      }

      try {
        await refreshMe();
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return onUnauthorized(() => {
      clearAuth();
      setIsAuthLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({ token, setToken, user, setUser, refreshMe, logout, isAuthLoading }),
    [token, user, isAuthLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
