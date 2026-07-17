import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEvents } from '../entities/webhook_events.entity';
import { CreateWebhookEventsDto } from '../dto/create-webhook_events.dto';

@Injectable()
export class CreateWebhookEventsService {
  constructor(
    @InjectRepository(WebhookEvents)
    private readonly repository: Repository<WebhookEvents>,
  ) {}

  async execute(dto: CreateWebhookEventsDto, organizationId: string): Promise<WebhookEvents> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
