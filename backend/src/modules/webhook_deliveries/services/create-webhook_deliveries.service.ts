import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeliveries } from '../entities/webhook_deliveries.entity';
import { CreateWebhookDeliveriesDto } from '../dto/create-webhook_deliveries.dto';

@Injectable()
export class CreateWebhookDeliveriesService {
  constructor(
    @InjectRepository(WebhookDeliveries)
    private readonly repository: Repository<WebhookDeliveries>,
  ) {}

  async execute(dto: CreateWebhookDeliveriesDto, organizationId: string): Promise<WebhookDeliveries> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
