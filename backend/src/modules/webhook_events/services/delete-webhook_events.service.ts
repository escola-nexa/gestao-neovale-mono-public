import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEvents } from '../entities/webhook_events.entity';

@Injectable()
export class DeleteWebhookEventsService {
  constructor(
    @InjectRepository(WebhookEvents)
    private readonly repository: Repository<WebhookEvents>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
