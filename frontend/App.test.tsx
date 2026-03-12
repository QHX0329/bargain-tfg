import React from 'react';
import { render } from '@testing-library/react-native';
import App from './App';

describe('App Component', () => {
  it('renders correctly without crashing', () => {
    // Si la app tiene providers de navegación o estado global, 
    // render() los inicializará aquí. Si falla, detectaremos componentes rotos.
    const component = render(<App />);
    expect(component).toBeDefined();
  });
});