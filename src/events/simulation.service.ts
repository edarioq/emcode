import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface VehicleDataPoint {
  lat: number;
  lng: number;
  angle: number;
  speed: number;
  status: string;
  timestamp: string;
}

@Injectable()
export class SimulationService implements OnModuleInit, OnModuleDestroy {
  private server: Server;
  private vehicles: Record<string, VehicleDataPoint[]> = {};
  private vehicleTimers: Record<string, NodeJS.Timeout> = {};
  private currentIndices: Record<string, number> = {};

  onModuleInit() {
    this.loadVehicleData();
    this.startSimulation();
  }

  onModuleDestroy() {
    this.stopSimulation();
  }

  setServer(server: Server) {
    this.server = server;
  }

  isValidPlate(plate: string): boolean {
    return plate in this.vehicles;
  }

  private loadVehicleData() {
    const vehiclePlateNumbers = [
      'DXB-AX-36352',
      'DXB-BX-36355',
      'DXB-CX-36357',
      'DXB-CX-36358',
      'DXB-DX-36353',
      'DXB-DX-36357',
      'DXB-DX-36359',
      'DXB-IX-36356',
      'DXB-IX-36360',
      'DXB-XX-36353',
    ];

    vehiclePlateNumbers.forEach(plate => {
      const filePath = join(process.cwd(), 'src', 'data', `${plate}.json`);

      if (existsSync(filePath)) {
        try {
          const data = readFileSync(filePath, 'utf-8');
          this.vehicles[plate] = JSON.parse(data);
          this.currentIndices[plate] = 0;
          console.log(`Loaded data for vehicle ${plate}`);
        } catch (error) {
          console.error(`Error loading data for vehicle ${plate}:`, error);
        }
      } else {
        console.warn(`Data file for vehicle ${plate} does not exist.`);
      }
    });
  }

  private startSimulation() {
    Object.keys(this.vehicles).forEach(plate => {
      this.vehicleTimers[plate] = setInterval(() => {
        this.emitNextDataPoint(plate);
      }, 1000);
    });
    console.log('Simulation started for all vehicles.');
  }

  private stopSimulation() {
    Object.values(this.vehicleTimers).forEach(timer => clearInterval(timer));
    console.log('Simulation stopped.');
  }

  private emitNextDataPoint(plate: string) {
    const vehicleData = this.vehicles[plate];
    if (!vehicleData) return;

    let currentIndex = this.currentIndices[plate];
    if (currentIndex >= vehicleData.length) {
      this.currentIndices[plate] = 0;
      currentIndex = 0;
    }

    const dataPoint = vehicleData[currentIndex];
    this.server.to(plate).emit('vehicleData', { plate, data: dataPoint });
    console.log(`Emitted data for ${plate}:`, dataPoint);

    this.currentIndices[plate] += 1;
  }
}
