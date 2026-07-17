import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeliveries } from '../entities/webhook_deliveries.entity';

@Injectable()
export class DeleteWebhookDeliveriesService {
  constructor(
    @InjectRepository(WebhookDeliveries)
    private readonly repository: Repository<WebhookDeliveries>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
