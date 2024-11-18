import { io, Socket } from 'socket.io-client';

interface VehicleDataPoint {
  lat: number;
  lng: number;
  angle: number;
  speed: number;
  status: string;
  timestamp: string;
}

interface VehicleData {
  plate: string;
  data: VehicleDataPoint;
}

interface SubscriptionPayload {
  plate: string;
}

export class VehicleService {
  private socket: Socket;
  private subscribers: Map<string, (data: VehicleData) => void> = new Map();

  constructor() {
    console.log('Initializing WebSocket service');
    this.socket = io('http://localhost:3000', {
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
    });

    this.socket.on('vehicleData', (data: VehicleData) => {
      const callback = this.subscribers.get(data.plate);
      if (callback) {
        callback(data);
      }
    });
  }

  subscribeToVehicle(plate: string, callback: (data: VehicleData) => void) {
    console.log(`Subscribing to vehicle ${plate}`);
    this.subscribers.set(plate, callback);
    const payload: SubscriptionPayload = { plate };
    this.socket.emit('subscribeToVehicle', payload);
  }

  unsubscribeFromVehicle(plate: string) {
    console.log(`Unsubscribing from vehicle ${plate}`);
    this.subscribers.delete(plate);
    const payload: SubscriptionPayload = { plate };
    this.socket.emit('unsubscribeFromVehicle', payload);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export const vehicleService = new VehicleService();
export type { VehicleData, VehicleDataPoint };
