import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SimulationService } from './simulation.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly simulationService: SimulationService) {}

  afterInit(server: Server) {
    this.simulationService.setServer(server);
    console.log('WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToVehicle')
  handleSubscribeToVehicle(
    @MessageBody() data: { plate: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { plate } = data;
    if (this.simulationService.isValidPlate(plate)) {
      client.join(plate);
      client.emit('subscribed', { plate });
      console.log(`Client ${client.id} subscribed to vehicle ${plate}`);
    } else {
      client.emit('error', { message: `Invalid plate number: ${plate}` });
      console.warn(
        `Client ${client.id} attempted to subscribe to invalid plate ${plate}`,
      );
    }
  }

  @SubscribeMessage('unsubscribeFromVehicle')
  handleUnsubscribeFromVehicle(
    @MessageBody() data: { plate: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { plate } = data;
    client.leave(plate);
    client.emit('unsubscribed', { plate });
    console.log(`Client ${client.id} unsubscribed from vehicle ${plate}`);
  }
}
