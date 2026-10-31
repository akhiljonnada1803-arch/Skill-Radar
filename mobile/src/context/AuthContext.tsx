import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../api/client';
import { StudentProfile, DomainItem } from '../types';

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  profile: StudentProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  selectDomain: (domain: DomainItem) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  userEmail: null,
  profile: null,
  isLoading: true,
  login: async () => {},
  loginDemo: async () => {},
  register: async () => {},
  logout: async () => {},
  selectDomain: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
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
        const savedToken = await AsyncStorage.getItem('skillradar_token');
        const savedEmail = await AsyncStorage.getItem('skillradar_user_email');
        if (savedToken) {
          setToken(savedToken);
          setAuthToken(savedToken);
          setUserEmail(savedEmail);
          const p = await api.getProfile();
          setProfile(p);
        } else {
          setToken(null);
          setAuthToken(null);
          setUserEmail(null);
          setProfile(null);
        }
      } catch (err) {
        console.warn('Init error', err);
        setToken(null);
        setAuthToken(null);
        setProfile(null);
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
      const emailVal = res.user?.email || email;
      setToken(res.access_token);
      setAuthToken(res.access_token);
      setUserEmail(emailVal);
      await AsyncStorage.setItem('skillradar_token', res.access_token);
      await AsyncStorage.setItem('skillradar_user_email', emailVal);
      const p = await api.getProfile();
      setProfile(p);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async () => {
    setIsLoading(true);
    try {
      const demoToken = '00000000-0000-0000-0000-000000000001';
      const demoEmail = 'student@skillradar.demo';
      setToken(demoToken);
      setAuthToken(demoToken);
      setUserEmail(demoEmail);
      await AsyncStorage.setItem('skillradar_token', demoToken);
      await AsyncStorage.setItem('skillradar_user_email', demoEmail);
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
      const emailVal = res.user?.email || email;
      setToken(res.access_token);
      setAuthToken(res.access_token);
      setUserEmail(emailVal);
      await AsyncStorage.setItem('skillradar_token', res.access_token);
      await AsyncStorage.setItem('skillradar_user_email', emailVal);
      const p = await api.getProfile();
      setProfile(p);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setAuthToken(null);
    setUserEmail(null);
    setProfile(null);
    try {
      await AsyncStorage.removeItem('skillradar_token');
      await AsyncStorage.removeItem('skillradar_user_email');
    } catch (err) {
      console.warn('Logout storage clear error', err);
    }
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
        loginDemo,
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
