import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeliveries } from '../entities/webhook_deliveries.entity';

@Injectable()
export class FindWebhookDeliveriesService {
  constructor(
    @InjectRepository(WebhookDeliveries)
    private readonly repository: Repository<WebhookDeliveries>,
  ) {}

  async findAll(organizationId: string): Promise<WebhookDeliveries[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<WebhookDeliveries | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
