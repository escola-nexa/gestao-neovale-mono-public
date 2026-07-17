import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookDeliveries } from '../entities/webhook_deliveries.entity';
import { UpdateWebhookDeliveriesDto } from '../dto/update-webhook_deliveries.dto';

@Injectable()
export class UpdateWebhookDeliveriesService {
  constructor(
    @InjectRepository(WebhookDeliveries)
    private readonly repository: Repository<WebhookDeliveries>,
  ) {}

  async execute(id: string, dto: UpdateWebhookDeliveriesDto, organizationId: string): Promise<WebhookDeliveries> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
