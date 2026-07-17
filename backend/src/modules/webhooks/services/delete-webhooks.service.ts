import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhooks } from '../entities/webhooks.entity';

@Injectable()
export class DeleteWebhooksService {
  constructor(
    @InjectRepository(Webhooks)
    private readonly repository: Repository<Webhooks>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
