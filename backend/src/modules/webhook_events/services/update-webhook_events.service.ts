import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEvents } from '../entities/webhook_events.entity';
import { UpdateWebhookEventsDto } from '../dto/update-webhook_events.dto';

@Injectable()
export class UpdateWebhookEventsService {
  constructor(
    @InjectRepository(WebhookEvents)
    private readonly repository: Repository<WebhookEvents>,
  ) {}

  async execute(id: string, dto: UpdateWebhookEventsDto, organizationId: string): Promise<WebhookEvents> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
