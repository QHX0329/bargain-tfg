import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Spin, Alert } from 'antd';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { storeService } from '../../../api/storeService';
import type { Store } from '../../../types/consumer';

// Fix Leaflet's broken default icons when bundled with Vite
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const SEVILLE_CENTER: [number, number] = [37.3886, -5.9823];

const MapPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userPosition, setUserPosition] = useState<[number, number]>(SEVILLE_CENTER);
  const [geolocationDenied, setGeolocationDenied] = useState<boolean>(false);

  useEffect(() => {
    let lat = SEVILLE_CENTER[0];
    let lng = SEVILLE_CENTER[1];

    const fetchStores = async (latitude: number, longitude: number) => {
      try {
        const result = await storeService.getNearby(latitude, longitude, 10);
        setStores(result.filter((s) => s.location != null));
      } catch {
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setUserPosition([lat, lng]);
          void fetchStores(lat, lng);
        },
        () => {
          setGeolocationDenied(true);
          void fetchStores(lat, lng);
        },
      );
    } else {
      setGeolocationDenied(true);
      void fetchStores(lat, lng);
    }
  }, []);

  return (
    <>
      <Typography.Title level={3}>Mapa de Tiendas</Typography.Title>
      {geolocationDenied && (
        <Alert
          type="info"
          message="Ubicación no disponible — mostrando tiendas cerca del centro de Sevilla"
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      {loading ? (
        <Spin tip="Cargando tiendas..." />
      ) : (
        <MapContainer
          center={userPosition}
          zoom={13}
          style={{ height: '70vh', width: '100%', borderRadius: 14 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {stores
            .filter((s) => s.location?.coordinates)
            .map((store) => (
              <Marker
                key={store.id}
                position={[store.location!.coordinates[1], store.location!.coordinates[0]]}
              >
                <Popup>
                  <strong>{store.name}</strong>
                  <br />
                  <span>{store.chain}</span>
                  <br />
                  <span>{store.address}</span>
                  <br />
                  <a href={`/app/map/store/${store.id}`}>Ver detalles</a>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      )}
      <div style={{ marginTop: 16 }}>
        <Typography.Text type="secondary">{stores.length} tienda(s) encontrada(s)</Typography.Text>
        {' · '}
        <Link to="/app/favorites">Mis favoritas</Link>
      </div>
    </>
  );
};

export default MapPage;
