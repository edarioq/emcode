import styles from "./styles.module.scss";

interface VehicleInfoProps {
  info: {
    plate: string;
    status: string;
    speed: number;
    angle: number;
    position: {
      lat: number;
      lng: number;
    };
    timestamp: string;
  } | null;
  onClose: () => void;
}

export function VehicleStatus({ info, onClose }: VehicleInfoProps) {
  if (!info) return null;

  return (
    <div className={styles.status}>
      <button className={styles.close} onClick={onClose}>
        x
      </button>
      <div className={styles.statusGrid}>
        <span className={styles.label}>Status:</span>
        <span>{info.status}</span>
        <span className={styles.label}>Speed:</span>
        <span>{info.speed} km/h</span>
        <span className={styles.label}>Direction:</span>
        <span>{info.angle}°</span>
        <span className={styles.label}>Position:</span>
        <span>
          {info.position.lat.toFixed(6)}, {info.position.lng.toFixed(6)}
        </span>
        <span className={styles.label}>Time:</span>
        <span>{new Date(info.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
