import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.scss";
import { VehicleList } from "./VehicleList";
import {
  vehicleService,
  type VehicleData,
  type VehicleDataPoint,
} from "./VehicleService";
import { VehicleStatus } from "./VehicleStatus";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API;

const DUBAI_CENTER: [number, number] = [55.296249, 25.276987];

export default function VehicleMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  const isMapMoving = useRef<boolean>(false);
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(
    new Set()
  );
  const [vehicleInfos, setVehicleInfos] = useState<
    Record<string, VehicleDataPoint>
  >({});
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState<{
    plate: string;
    status: string;
    speed: number;
    angle: number;
    position: {
      lat: number;
      lng: number;
    };
    timestamp: string;
  } | null>(null);

  function createMarkerElement(
    status: string,
    angle: number,
    data: VehicleDataPoint,
    plate: string
  ): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "vehicle-marker";
    el.style.width = "40px";
    el.style.height = "40px";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.cursor = "pointer";
    el.style.transition = "transform 0.2s ease";

    const circle = document.createElement("div");
    circle.style.position = "absolute";
    circle.style.width = "100%";
    circle.style.height = "100%";
    circle.style.borderRadius = "50%";
    circle.style.backgroundColor = '#0084FF';
    circle.classList.add('pulse')
    circle.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
    circle.style.transition = "transform 0.2s ease";

    const iconContainer = document.createElement("div");
    iconContainer.style.width = "24px";
    iconContainer.style.height = "24px";
    iconContainer.style.position = "relative";
    iconContainer.style.backgroundSize = "contain";
    iconContainer.style.backgroundRepeat = "no-repeat";
    iconContainer.style.backgroundPosition = "center";
    iconContainer.style.filter = "brightness(0) invert(1)";
    iconContainer.style.zIndex = "1";

    if (status === "moving") {
      iconContainer.style.backgroundImage = "url(/arrow-icon.svg)";
      iconContainer.style.transform = `rotate(${angle}deg)`;
    } else {
      iconContainer.style.backgroundImage = "url(/default-icon.svg)";
    }

    el.addEventListener("click", () => {
      setSelectedVehicleInfo({
        plate,
        status: data.status,
        speed: data.speed,
        angle: data.angle,
        position: {
          lat: data.lat,
          lng: data.lng,
        },
        timestamp: data.timestamp,
      });
    });

    el.appendChild(circle);
    el.appendChild(iconContainer);
    return el;
  }

  const handleVehicleToggle = (plate: string, checked: boolean) => {
    if (checked) {
      // Subscribe to vehicle
      vehicleService.subscribeToVehicle(plate, (vehicleData: VehicleData) => {
        if (!map.current) return;

        const { data } = vehicleData;
        setVehicleInfos((prev) => ({
          ...prev,
          [plate]: data,
        }));

        if (!isMapMoving.current) {
          if (!markers.current[plate]) {
            const el = createMarkerElement(
              data.status,
              data.angle,
              data,
              plate
            );
            const marker = new mapboxgl.Marker({
              element: el,
              anchor: "center",
            })
              .setLngLat([data.lng, data.lat])
              .addTo(map.current);

            markers.current[plate] = marker;
          } else {
            const marker = markers.current[plate];
            marker.setLngLat([data.lng, data.lat]);
            const markerEl = marker.getElement();
            const circle = markerEl.firstChild as HTMLElement;
            const iconContainer = markerEl.lastChild as HTMLElement;

            if (data.status === "moving") {
              iconContainer.style.backgroundImage = "url(/arrow-icon.svg)";
              iconContainer.style.transform = `rotate(${data.angle}deg)`;
              circle.style.backgroundColor = "#0084FF";
            } else {
              iconContainer.style.backgroundImage = "url(/default-icon.svg)";
              iconContainer.style.transform = "none";
              circle.style.backgroundColor = "#0084FF";
            }

            // Update click handler
            markerEl.onclick = () => {
              setSelectedVehicleInfo({
                plate,
                status: data.status,
                speed: data.speed,
                angle: data.angle,
                position: {
                  lat: data.lat,
                  lng: data.lng,
                },
                timestamp: data.timestamp,
              });
            };
          }
        }
      });

      setSelectedVehicles((prev) => new Set([...prev, plate]));
    } else {
      // Unsubscribe and cleanup
      vehicleService.unsubscribeFromVehicle(plate);

      // Make sure to remove the marker
      if (markers.current[plate]) {
        markers.current[plate].remove();
        delete markers.current[plate];
      }

      // Clean up states
      setSelectedVehicles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(plate);
        return newSet;
      });

      setVehicleInfos((prev) => {
        const newInfos = { ...prev };
        delete newInfos[plate];
        return newInfos;
      });

      // Force a re-render of the map to ensure marker is removed
      if (map.current) {
        map.current.triggerRepaint();
      }
    }
  };

  const handleCloseInfo = () => {
    setSelectedVehicleInfo(null);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DUBAI_CENTER,
      zoom: 12,
      pitch: 0,
      bearing: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "bottom-right"
    );

    map.current.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: "metric",
      }),
      "bottom-right"
    );

    map.current.on("movestart", () => {
      isMapMoving.current = true;
    });

    map.current.on("moveend", () => {
      isMapMoving.current = false;
      Object.entries(vehicleInfos).forEach(([plate, info]) => {
        if (selectedVehicles.has(plate) && markers.current[plate]) {
          markers.current[plate].setLngLat([info.lng, info.lat]);
        }
      });
    });

    return () => {
      Object.values(markers.current).forEach((marker) => marker.remove());
      selectedVehicles.forEach((plate) => {
        vehicleService.unsubscribeFromVehicle(plate);
      });
      map.current?.remove();
    };
  }, []);

  return (
    <div className={styles.map}>
      <VehicleList selectedVehicles={selectedVehicles} handleVehicleToggle={handleVehicleToggle}/>
      {selectedVehicleInfo && (
        <VehicleStatus info={selectedVehicleInfo} onClose={handleCloseInfo} />
      )}

      <div ref={mapContainer} className={styles.container} />
    </div>
  );
}
