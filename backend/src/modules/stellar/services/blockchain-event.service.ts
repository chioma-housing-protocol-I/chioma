import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SorobanRpc } from '@stellar/stellar-sdk';

export interface BlockchainEvent {
  type: string;
  agreementId: string;
  data: any;
  timestamp: number;
  transactionHash: string;
}

@Injectable()
export class BlockchainEventService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainEventService.name);
  private readonly server: SorobanRpc.Server;
  private isListening = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    this.server = new SorobanRpc.Server(rpcUrl);
  }

  async onModuleInit() {
    await this.startListening();
  }

  async startListening() {
    if (this.isListening) return;
    this.isListening = true;
    this.logger.log('Started listening for blockchain events');
  }

  async stopListening() {
    this.isListening = false;
    this.logger.log('Stopped listening for blockchain events');
  }

  private emitEvent(event: BlockchainEvent) {
    this.eventEmitter.emit(`blockchain.${event.type}`, event);
    this.logger.debug(
      `Emitted event: ${event.type} for agreement ${event.agreementId}`,
    );
  }
}
