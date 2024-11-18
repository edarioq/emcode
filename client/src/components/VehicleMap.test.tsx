import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import mapboxgl from 'mapbox-gl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../store/store';
import VehicleMap from './VehicleMap';
import type { VehicleData } from './VehicleService';
import { vehicleService } from './VehicleService';

vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      triggerRepaint: vi.fn(),
    })),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      getElement: vi.fn().mockReturnValue(document.createElement('div')),
    })),
    accessToken: '',
  },
}));

vi.mock('./VehicleService', () => {
  let subscriptionCallback: ((data: VehicleData) => void) | null = null;

  return {
    vehicleService: {
      subscribeToVehicle: vi.fn((plate: string, callback: (data: VehicleData) => void) => {
        subscriptionCallback = callback;
      }),
      unsubscribeFromVehicle: vi.fn(),
      __triggerCallback: (data: VehicleData) => {
        if (subscriptionCallback) {
          subscriptionCallback(data);
        }
      }
    }
  };
});

const mockVehicleData: VehicleData = {
  plate: 'DXB-AX-36352',
  data: {
    lat: 25.2048,
    lng: 55.2708,
    angle: 45,
    speed: 60,
    status: 'moving',
    timestamp: '2024-01-01T12:00:00Z'
  }
};

describe('VehicleMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes map with correct configuration', () => {
    render(
      <Provider store={store}>
        <VehicleMap />
      </Provider>
    );

    expect(mapboxgl.Map).toHaveBeenCalledWith({
      container: expect.any(HTMLDivElement),
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [55.296249, 25.276987],
      zoom: 12,
      pitch: 0,
      bearing: 0,
    });

    expect(mapboxgl.NavigationControl).toHaveBeenCalledWith({
      showCompass: true,
      showZoom: true,
      visualizePitch: true,
    });

    expect(mapboxgl.ScaleControl).toHaveBeenCalledWith({
      maxWidth: 100,
      unit: 'metric',
    });
  });

  it('handles vehicle subscription and updates marker', () => {
    const { container } = render(
      <Provider store={store}>
        <VehicleMap />
      </Provider>
    );

    const checkbox = screen.getByRole('checkbox', { name: /DXB-AX-36352/i });
    fireEvent.click(checkbox);

    (vehicleService as any).__triggerCallback(mockVehicleData);

    const marker = container.querySelector('.vehicle-marker');
    expect(marker).toBeTruthy();
    const circle = marker?.querySelector('div');
    expect(circle).toHaveStyle({ backgroundColor: '#0084FF' });
    expect(circle).toHaveClass('pulse');
  });

  it('handles vehicle unsubscription', () => {
    render(
      <Provider store={store}>
        <VehicleMap />
      </Provider>
    );

    const checkbox = screen.getByRole('checkbox', { name: /DXB-AX-36352/i });
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    expect(vehicleService.unsubscribeFromVehicle).toHaveBeenCalledWith('DXB-AX-36352');
    expect(vehicleService.unsubscribeFromVehicle).toHaveBeenCalledTimes(1);
  });

  it('displays vehicle status when marker is clicked', async () => {
    const { container } = render(
      <Provider store={store}>
        <VehicleMap />
      </Provider>
    );

    const checkbox = screen.getByRole('checkbox', { name: /DXB-AX-36352/i });
    fireEvent.click(checkbox);

    (vehicleService as any).__triggerCallback(mockVehicleData);

    const marker = container.querySelector('.vehicle-marker');
    expect(marker).toBeInTheDocument();
    fireEvent.click(marker!);

    const vehicleInfo = screen.getByText(/60 km\/h/);
    expect(vehicleInfo).toBeInTheDocument();
    expect(screen.getByText(/moving/)).toBeInTheDocument();
    expect(screen.getByText('45°')).toBeInTheDocument();
  });
});
