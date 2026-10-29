import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../api/client';
import { StudentProfile, DomainItem } from '../types';

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  profile: StudentProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  selectDomain: (domain: DomainItem) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  userEmail: null,
  profile: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  selectDomain: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>('demo-token');
  const [userEmail, setUserEmail] = useState<string | null>('alex.rivera@fieldsurvey.org');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
    } catch (e) {
      console.warn('Failed to fetch profile', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        setAuthToken('demo-token');
        const p = await api.getProfile();
        setProfile(p);
      } catch (err) {
        console.warn('Init error', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      setToken(res.access_token);
      setAuthToken(res.access_token);
      setUserEmail(res.user.email || email);
      const p = await api.getProfile();
      setProfile(p);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(email, pass);
      setToken(res.access_token);
      setAuthToken(res.access_token);
      setUserEmail(res.user.email || email);
      const p = await api.getProfile();
      setProfile(p);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setAuthToken(null);
    setUserEmail(null);
    setProfile(null);
  };

  const selectDomain = async (domain: DomainItem) => {
    setIsLoading(true);
    try {
      await api.updateProfile({ selected_domain_id: domain.id });
      await api.createRoadmap(domain.id);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userEmail,
        profile,
        isLoading,
        login,
        register,
        logout,
        selectDomain,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
