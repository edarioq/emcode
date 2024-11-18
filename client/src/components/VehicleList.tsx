import { useSelector } from 'react-redux';
import { selectPlates } from '../store/vehiclePlatesSlice';
import styles from "./styles.module.scss";

interface Props {
  selectedVehicles: Set<string>;
  handleVehicleToggle: (plate: string, checked: boolean) => void;
}

export function VehicleList({selectedVehicles, handleVehicleToggle}: Props) {
  const plates = useSelector(selectPlates);

  return (
    <div className={styles.list}>
        Select the Vehicles to Track
        {plates.map((plate) => (
          <label key={plate} className={styles.item}>
            <input
              type="checkbox"
              checked={selectedVehicles.has(plate)}
              onChange={(e) => handleVehicleToggle(plate, e.target.checked)}
            />
            <span>{plate}</span>
          </label>
        ))}
      </div>
  )
}
