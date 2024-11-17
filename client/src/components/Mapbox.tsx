import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';
import { webSocketService, type VehicleData } from './WebSocketService';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API;

const VEHICLE_PLATES = [
  'DXB-AX-36352',
  'DXB-BX-36355',
  'DXB-CX-36357',
  'DXB-CX-36358',
  'DXB-DX-36353',
  'DXB-DX-36357',
  'DXB-DX-36359',
  'DXB-IX-36356',
  'DXB-IX-36360',
  'DXB-XX-36353'
];

const DUBAI_CENTER: [number, number] = [55.296249, 25.276987];

interface StartPositions {
  [key: string]: [number, number];
}

interface QueuedUpdate {
  plate: string;
  lng: number;
  lat: number;
  status: string;
  angle: number;
}

function createMarkerElement(status: string, angle: number, isStartPosition: boolean = false): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'vehicle-marker';
  el.style.width = '40px';
  el.style.height = '40px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 0.2s ease';

  const circle = document.createElement('div');
  circle.style.position = 'absolute';
  circle.style.width = '100%';
  circle.style.height = '100%';
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = isStartPosition ?
    'rgba(50, 205, 50, 0.9)' :
    (status === 'moving' ? 'rgba(65, 105, 225, 0.9)' : 'rgba(128, 128, 128, 0.9)');
  circle.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';


  const iconContainer = document.createElement('div');
  iconContainer.style.width = '24px';
  iconContainer.style.height = '24px';
  iconContainer.style.position = 'relative';
  iconContainer.style.backgroundSize = 'contain';
  iconContainer.style.backgroundRepeat = 'no-repeat';
  iconContainer.style.backgroundPosition = 'center';
  iconContainer.style.filter = 'brightness(0) invert(1)';
  iconContainer.style.zIndex = '1';

  if (isStartPosition) {
    iconContainer.style.backgroundImage = 'url(/begin-start.svg)';
  } else {
    switch (status) {
      case 'moving':
        iconContainer.style.backgroundImage = 'url(/arrow-icon.svg)';
        iconContainer.style.transform = `rotate(${angle}deg)`;
        break;
      default:
        iconContainer.style.backgroundImage = 'url(/default-icon.svg)';
    }
  }

  el.onmouseenter = () => {
    circle.style.transform = 'scale(1.1)';
  };
  el.onmouseleave = () => {
    circle.style.transform = 'scale(1)';
  };

  el.appendChild(circle);
  el.appendChild(iconContainer);
  return el;
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  const startMarkers = useRef<Record<string, mapboxgl.Marker>>({});
  const isFirstDataPoint = useRef<boolean>(true);
  const startPositions = useRef<StartPositions>({});
  const isMapMoving = useRef<boolean>(false);
  const updateQueue = useRef<QueuedUpdate[]>([]);
  const moveEndTimeout = useRef<NodeJS.Timeout | null>(null);

  const processQueuedUpdates = () => {
    while (updateQueue.current.length > 0) {
      const update = updateQueue.current.pop();
      if (!update || !map.current) continue;

      const { plate, lng, lat, status, angle } = update;
      const marker = markers.current[plate];
      if (!marker) continue;

      marker.setLngLat([lng, lat]);
      const markerEl = marker.getElement();
      const circle = markerEl.firstChild as HTMLElement;
      const iconContainer = markerEl.lastChild as HTMLElement;

      if (markerEl.dataset.status !== status || markerEl.dataset.angle !== angle.toString()) {
        if (status === 'moving') {
          iconContainer.style.transform = `rotate(${angle}deg)`;
          circle.style.backgroundColor = 'rgba(65, 105, 225, 0.9)';
        } else {
          iconContainer.style.transform = 'none';
          circle.style.backgroundColor = 'rgba(128, 128, 128, 0.9)';
        }
        markerEl.dataset.status = status;
        markerEl.dataset.angle = angle.toString();
      }
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    const currentMarkers: Record<string, mapboxgl.Marker> = {};
    const currentStartMarkers: Record<string, mapboxgl.Marker> = {};

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: DUBAI_CENTER,
      zoom: 12,
      pitch: 0,
      bearing: 0
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Add event listeners for map movement
    map.current.on('movestart', () => {
      isMapMoving.current = true;
    });

    map.current.on('moveend', () => {
      // Add a small delay before processing updates to ensure smooth zooming
      if (moveEndTimeout.current) {
        clearTimeout(moveEndTimeout.current);
      }
      moveEndTimeout.current = setTimeout(() => {
        isMapMoving.current = false;
        processQueuedUpdates();
      }, 150); // Adjust this delay as needed
    });

    VEHICLE_PLATES.forEach(plate => {
      webSocketService.subscribeToVehicle(plate, (vehicleData: VehicleData) => {
        if (!map.current) return;

        const { lng, lat, status, angle } = vehicleData.data;

        // Set start position for this vehicle if not already set
        if (!startPositions.current[plate]) {
          startPositions.current[plate] = [lng, lat];

          const startEl = createMarkerElement(status, angle, true);
          currentStartMarkers[plate] = new mapboxgl.Marker({
            element: startEl,
            anchor: 'center'
          })
            .setLngLat([lng, lat])
            .addTo(map.current);
        }

        if (isFirstDataPoint.current) {
          map.current.setCenter([lng, lat]);
          map.current.setZoom(14);
          isFirstDataPoint.current = false;
        }

        // Create or update vehicle marker
        if (!currentMarkers[plate]) {
          const el = createMarkerElement(status, angle);
          currentMarkers[plate] = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
          })
            .setLngLat([lng, lat])
            .addTo(map.current);
        } else if (isMapMoving.current) {
          // Queue the update if the map is moving
          updateQueue.current.push({ plate, lng, lat, status, angle });
        } else {
          // Update immediately if the map is static
          const marker = currentMarkers[plate];
          marker.setLngLat([lng, lat]);
          const markerEl = marker.getElement();
          const circle = markerEl.firstChild as HTMLElement;
          const iconContainer = markerEl.lastChild as HTMLElement;

          if (markerEl.dataset.status !== status || markerEl.dataset.angle !== angle.toString()) {
            if (status === 'moving') {
              iconContainer.style.transform = `rotate(${angle}deg)`;
              circle.style.backgroundColor = 'rgba(65, 105, 225, 0.9)';
            } else {
              iconContainer.style.transform = 'none';
              circle.style.backgroundColor = 'rgba(128, 128, 128, 0.9)';
            }
            markerEl.dataset.status = status;
            markerEl.dataset.angle = angle.toString();
          }
        }
      });
    });

    markers.current = currentMarkers;
    startMarkers.current = currentStartMarkers;

    return () => {
      if (moveEndTimeout.current) {
        clearTimeout(moveEndTimeout.current);
      }
      Object.values(currentMarkers).forEach(marker => marker.remove());
      Object.values(currentStartMarkers).forEach(marker => marker.remove());
      VEHICLE_PLATES.forEach(plate => {
        webSocketService.unsubscribeFromVehicle(plate, () => {});
      });
      map.current?.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }}
    />
  );
}

