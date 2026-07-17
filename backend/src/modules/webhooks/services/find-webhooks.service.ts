import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhooks } from '../entities/webhooks.entity';

@Injectable()
export class FindWebhooksService {
  constructor(
    @InjectRepository(Webhooks)
    private readonly repository: Repository<Webhooks>,
  ) {}

  async findAll(organizationId: string): Promise<Webhooks[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Webhooks | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
