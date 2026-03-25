import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from './App';

jest.mock('./src/utils/secureStorage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
  deleteItem: jest.fn(),
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true]),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('App Component', () => {
  it('renders correctly without crashing', async () => {
    // Si la app tiene providers de navegación o estado global, 
    // render() los inicializará aquí. Si falla, detectaremos componentes rotos.
    const component = render(<App />);
    await waitFor(() => {
      expect(component).toBeDefined();
    });
    expect(component).toBeDefined();
  });
});
