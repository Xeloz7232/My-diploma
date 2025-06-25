import React, { useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { List, Typography } from 'antd';
import { useAddressLocationQuery } from '../../app/services/dataApi';
import { Coords } from '../../app/types';
import MySpin from '../myAntd/spin';
import Legend from './map-legend';
import '../../index.css';

interface Bucket {
  addressName: string;
  items: Coords[];
}

// Параметры области Норильска
const norilskBounds: [[number, number], [number, number]] = [
  [69.18, 87.01],  // юго-западный угол (lat, lng) 
  [69.55, 88.64],  // северо-восточный угол
];

const MapRefresher: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
};

const CustomAttribution: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const attr = L.control.attribution({ prefix: false }).addTo(map);
    attr.setPrefix(`<a href="https://leafletjs.com/">Leaflet</a>`);
    return () => {
      map.removeControl(attr);
    };
  }, [map]);
  return null;
};

export const TaskMap: React.FC = () => {
  const { data, isLoading, error } = useAddressLocationQuery();
  const tasks: Coords[] = data ?? [];

  const buckets = useMemo(() => {
    const m = new Map<string, Bucket>();
    tasks.forEach(task => {
      const key = `${task.devices.addresses.lat}|${task.devices.addresses.lon}`;
      if (!m.has(key)) {
        m.set(key, {
          addressName: task.devices.addresses.name,
          items: [task]
        });
      } else {
        m.get(key)!.items.push(task);
      }
    });
    return m;
  }, [tasks]);

  if (isLoading) return <MySpin />;
  if (error) return <Typography.Text type="danger">Ошибка загрузки данных</Typography.Text>;

  return (
    <MapContainer
      bounds={norilskBounds}
      maxBounds={norilskBounds}
      maxBoundsViscosity={1.0}
      minZoom={10}
      maxZoom={16}
      attributionControl={false}
      center={[69.32, 87.97]}
      zoom={11}
      style={{ width: '100%', height: '600px' }}
    >
      <MapRefresher />
      <CustomAttribution />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='Данные © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> по <a href="https://opendatacommons.org/licenses/odbl/">лицензии ODbL</a>.'
      />

      <Legend />

      <MarkerClusterGroup
        maxClusterRadius={40}

        iconCreateFunction={(cluster: any): L.DivIcon => {
          const childMarkers: any[] = cluster.getAllChildMarkers();
          const totalTasks = childMarkers.reduce(
            (sum: number, m: any) => sum + (m.taskCount ?? 1),
            0
          );

          return L.divIcon({
            html: `<div style="
              width:40px;
              height:40px;
              border-radius:50%;
              background: rgba(24,144,255,0.8);
              color:white;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:14px;
              font-weight:bold;
            ">${totalTasks}</div>`,
            className: 'custom-cluster-icon',
            iconSize: [40, 40]
          });
        }}
      >
        {Array.from(buckets.entries()).map(([key, bucket]) => {
          const [lat, lon] = key.split('|').map(Number);

          // Цвет маркера
          const statusIds = bucket.items.map(t => t.statuses.id);
          const hasBlue = statusIds.some(id => [4, 5].includes(id));
          const hasGray = statusIds.some(id => id === 1);
          let backgroundStyle: string;
          if (hasBlue && hasGray) {
            backgroundStyle =
              'linear-gradient(to right, rgba(128,128,128,0.8) 50%, rgba(24,144,255,0.8) 50%)';
          } else if (hasBlue) {
            backgroundStyle = 'rgba(24,144,255,0.8)';
          } else if (hasGray) {
            backgroundStyle = 'rgba(128,128,128,0.8)';
          } else {
            backgroundStyle = 'rgba(24,144,255,0.8)';
          }

          const icon = L.divIcon({
            html: `<div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${backgroundStyle};
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 14px;
              cursor: pointer;
            ">${bucket.items.length}</div>`,
            className: '',
            iconSize: [32, 32]
          });

          return (
            <Marker
              key={key}
              position={[lat, lon]}
              icon={icon}
              eventHandlers={{
                add: (e) => {
                  e.target.taskCount = bucket.items.length;
                }
              }}
            >
              <Popup minWidth={150} maxWidth={200} className="task-popup">
                <Typography.Text
                  strong
                  style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                >
                  Адрес: {bucket.addressName}
                </Typography.Text>
                <div className="task-popup-list">
                  <List<Coords>
                    size="small"
                    dataSource={bucket.items}
                    renderItem={t => (
                      <List.Item style={{ padding: '2px 4px' }}>
                        <List.Item.Meta
                          title={<span style={{ fontSize: 13 }}>{t.task_number}</span>}
                          description={<span style={{ fontSize: 12 }}>{t.statuses.name}</span>}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};
