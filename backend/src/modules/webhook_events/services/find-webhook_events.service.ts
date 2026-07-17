import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEvents } from '../entities/webhook_events.entity';

@Injectable()
export class FindWebhookEventsService {
  constructor(
    @InjectRepository(WebhookEvents)
    private readonly repository: Repository<WebhookEvents>,
  ) {}

  async findAll(organizationId: string): Promise<WebhookEvents[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<WebhookEvents | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
