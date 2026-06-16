import { create } from 'zustand';

export interface DatabaseState {
  schema: string;
  indexes: string[];
  resolvedMissions: string[];
}

interface WorkspaceState {
  selectedConnectionId: string;
  activeScale: string;
  databaseState: DatabaseState | null;
  lastAuditReview: any;
  aiProvider: string;
  aiModel: string;
  setConnectionId: (id: string) => void;
  setActiveScale: (scale: string) => void;
  setDatabaseState: (state: DatabaseState) => void;
  setLastAuditReview: (review: any) => void;
  setAiConfig: (provider: string, model: string) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedConnectionId: localStorage.getItem('selectedConnectionId') || '',
  activeScale: '1M rows',
  databaseState: null,
  lastAuditReview: null,
  aiProvider: localStorage.getItem('aiProvider') || 'openai',
  aiModel: localStorage.getItem('aiModel') || 'gpt-4o',
  
  setConnectionId: (id) => {
    if (id) {
      localStorage.setItem('selectedConnectionId', id);
    } else {
      localStorage.removeItem('selectedConnectionId');
    }
    set({ selectedConnectionId: id });
  },
  
  setActiveScale: (scale) => set({ activeScale: scale }),
  
  setDatabaseState: (state) => set({ databaseState: state }),
  
  setLastAuditReview: (review) => set({ lastAuditReview: review }),
  
  setAiConfig: (provider, model) => {
    localStorage.setItem('aiProvider', provider);
    localStorage.setItem('aiModel', model);
    set({ aiProvider: provider, aiModel: model });
  },
  
  clearWorkspace: () => {
    localStorage.removeItem('selectedConnectionId');
    set({ 
      selectedConnectionId: '', 
      databaseState: null, 
      lastAuditReview: null 
    });
  },
}));
