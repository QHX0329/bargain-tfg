import React, { useEffect, useRef } from 'react';
import { Input } from 'antd';
import type { InputRef } from 'antd';

/** Dirección validada por Google con sus coordenadas. */
export interface SelectedAddress {
  address: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  /** Clave de Google Maps JS (Places). Si falta, se comporta como un input normal. */
  apiKey?: string;
  /** Valor del campo (lo inyecta Form.Item). */
  value?: string;
  /** Cambios de texto (lo inyecta Form.Item). */
  onChange?: (value: string) => void;
  /** Se invoca cuando el usuario elige una dirección válida del desplegable. */
  onSelect?: (selected: SelectedAddress) => void;
  placeholder?: string;
}

// --- Tipos mínimos de la API de Places que utilizamos -----------------------
interface GooglePlaceResult {
  formatted_address?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
}
interface GoogleAutocomplete {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => GooglePlaceResult;
}
interface GoogleMapsNamespace {
  maps?: {
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options?: Record<string, unknown>,
      ) => GoogleAutocomplete;
    };
    event?: { clearInstanceListeners: (instance: unknown) => void };
  };
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __gmapsPlacesLoader?: Promise<void>;
  }
}

/** Carga el script de Google Maps (Places) una sola vez para toda la aplicación. */
function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__gmapsPlacesLoader) return window.__gmapsPlacesLoader;

  window.__gmapsPlacesLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&language=es&region=ES`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
    document.head.appendChild(script);
  });
  return window.__gmapsPlacesLoader;
}

/**
 * Campo de dirección con autocompletado de Google Places. Solo permite elegir
 * direcciones reales del desplegable; al seleccionarlas devuelve las coordenadas
 * a través de `onSelect`. Si no hay clave configurada, degrada a un campo de
 * texto normal para no bloquear el formulario.
 */
const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  apiKey,
  value,
  onChange,
  onSelect,
  placeholder,
}) => {
  const inputRef = useRef<InputRef>(null);
  // Guardamos las últimas callbacks en refs para no reinstalar el listener.
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  onChangeRef.current = onChange;
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!apiKey) return;
    let autocomplete: GoogleAutocomplete | null = null;
    let cancelled = false;

    loadGoogleMapsPlaces(apiKey)
      .then(() => {
        if (cancelled) return;
        const places = window.google?.maps?.places;
        const el = inputRef.current?.input;
        if (!places || !el) return;

        autocomplete = new places.Autocomplete(el, {
          types: ['address'],
          componentRestrictions: { country: ['es'] },
          fields: ['formatted_address', 'geometry'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete?.getPlace();
          const location = place?.geometry?.location;
          if (place?.formatted_address && location) {
            const selected: SelectedAddress = {
              address: place.formatted_address,
              latitude: location.lat(),
              longitude: location.lng(),
            };
            onChangeRef.current?.(selected.address);
            onSelectRef.current?.(selected);
          }
        });
      })
      .catch(() => {
        // Si Google no carga, el campo sigue funcionando como texto libre.
      });

    return () => {
      cancelled = true;
      if (autocomplete) {
        window.google?.maps?.event?.clearInstanceListeners(autocomplete);
      }
    };
  }, [apiKey]);

  return (
    <Input
      ref={inputRef}
      size="large"
      value={value}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
};

export default AddressAutocomplete;
