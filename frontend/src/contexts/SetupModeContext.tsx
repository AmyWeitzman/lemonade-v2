import { createContext, useContext } from 'react';

export interface SetupModeContextValue {
  isSetupMode: boolean;
}

export const SetupModeContext = createContext<SetupModeContextValue>({
  isSetupMode: false,
});

export const useSetupMode = () => useContext(SetupModeContext);
