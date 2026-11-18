import React, { createContext, useContext, useState, useEffect } from 'react';

export type DeviceViewMode = 'auto' | 'mobile' | 'windows';

interface ViewModeContextType {
  viewMode: DeviceViewMode;
  setViewMode: (mode: DeviceViewMode) => void;
  isMobileDevice: boolean;
  effectiveIsMobile: boolean; // true if screen < 768px OR viewMode === 'mobile'
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const VIEW_MODE_KEY = 'elimucore_device_view_mode';

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<DeviceViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved as DeviceViewMode) || 'auto';
  });

  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setViewMode = (mode: DeviceViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const effectiveIsMobile = viewMode === 'mobile' || (viewMode === 'auto' && isMobileDevice);

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        isMobileDevice,
        effectiveIsMobile,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
