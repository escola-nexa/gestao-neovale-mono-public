import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SchoolHubState {
  schoolId: string | null;
  schoolName: string | null;
}

interface SchoolHubContextType extends SchoolHubState {
  setSchoolHub: (schoolId: string, schoolName: string) => void;
  clearSchoolHub: () => void;
}

const SchoolHubContext = createContext<SchoolHubContextType | undefined>(undefined);

export function SchoolHubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SchoolHubState>({ schoolId: null, schoolName: null });

  const setSchoolHub = useCallback((schoolId: string, schoolName: string) => {
    setState({ schoolId, schoolName });
  }, []);

  const clearSchoolHub = useCallback(() => {
    setState({ schoolId: null, schoolName: null });
  }, []);

  return (
    <SchoolHubContext.Provider value={{ ...state, setSchoolHub, clearSchoolHub }}>
      {children}
    </SchoolHubContext.Provider>
  );
}

export function useSchoolHub() {
  const ctx = useContext(SchoolHubContext);
  if (!ctx) throw new Error('useSchoolHub must be used within SchoolHubProvider');
  return ctx;
}
