import React, { createContext, useContext, ReactNode } from 'react';
import { useNotificationManager } from '../hooks/useNotificationManager';
import type { NotificationSettings } from '../services/notificationService';
import type { PermissionStatus } from 'expo-notifications';

interface NotificationContextType {
  settings: NotificationSettings | null;
  permission: PermissionStatus | null;
  isLoading: boolean;
  pushToken: string | null;
  requestPermission: () => Promise<PermissionStatus>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<boolean>;
  loadSettings: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notificationManager = useNotificationManager();

  return (
    <NotificationContext.Provider value={notificationManager}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
