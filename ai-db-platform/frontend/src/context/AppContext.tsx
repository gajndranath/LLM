import React, { createContext, useContext, useState } from 'react';

interface AppContextType {
  selectedConnectionId: string;
  setSelectedConnectionId: (id: string) => void;
  lastAuditReview: any;
  setLastAuditReview: (review: any) => void;
  activeScale: string;
  setActiveScale: (scale: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistence: Initial state from localStorage
  const [selectedConnectionId, setSelectedConnectionIdState] = useState<string>(() => {
    return localStorage.getItem('selectedConnectionId') || '';
  });
  const [lastAuditReview, setLastAuditReview] = useState<any>(null);
  const [activeScale, setActiveScale] = useState<string>('1M rows');

  // Custom setter to handle localStorage
  const setSelectedConnectionId = (id: string) => {
    setSelectedConnectionIdState(id);
    if (id) {
      localStorage.setItem('selectedConnectionId', id);
    } else {
      localStorage.removeItem('selectedConnectionId');
    }
  };

  return (
    <AppContext.Provider value={{
      selectedConnectionId,
      setSelectedConnectionId,
      lastAuditReview,
      setLastAuditReview,
      activeScale,
      setActiveScale
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
