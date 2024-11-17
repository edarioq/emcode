import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { SimulationService } from './simulation.service';

@Module({
  providers: [EventsGateway, SimulationService],
})
export class EventsModule {}
