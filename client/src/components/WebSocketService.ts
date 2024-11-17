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

export class WebSocketService {
  private socket: Socket;
  private subscribers: Map<string, ((data: VehicleData) => void)[]> = new Map();

  constructor() {
    console.log('Initializing WebSocket service');
    this.socket = io('http://localhost:3000', {
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server', this.socket.id);
      // Resubscribe to all vehicles on reconnect
      this.subscribers.forEach((_, plate) => {
        const payload: SubscriptionPayload = { plate };
        this.socket.emit('subscribeToVehicle', payload);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
    });

    this.socket.on('vehicleData', (data: VehicleData) => {
      console.log('Received vehicle data:', data);
      const callbacks = this.subscribers.get(data.plate);
      if (callbacks && callbacks.length > 0) {
        callbacks.forEach(callback => callback(data));
      }
    });
  }

  subscribeToVehicle(plate: string, callback: (data: VehicleData) => void) {
    console.log(`Subscribing to vehicle ${plate}`);

    if (!this.subscribers.has(plate)) {
      this.subscribers.set(plate, []);
      const payload: SubscriptionPayload = { plate };
      this.socket.emit('subscribeToVehicle', payload);
    }

    const callbacks = this.subscribers.get(plate)!;
    callbacks.push(callback);
  }

  unsubscribeFromVehicle(plate: string, callback: (data: VehicleData) => void) {
    console.log(`Unsubscribing from vehicle ${plate}`);
    const callbacks = this.subscribers.get(plate);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }

    if (callbacks.length === 0) {
      this.subscribers.delete(plate);
      const payload: SubscriptionPayload = { plate };
      this.socket.emit('unsubscribeFromVehicle', payload);
    }
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export const webSocketService = new WebSocketService();
export type { VehicleData, VehicleDataPoint };
