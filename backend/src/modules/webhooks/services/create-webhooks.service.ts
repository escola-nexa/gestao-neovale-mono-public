import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhooks } from '../entities/webhooks.entity';
import { CreateWebhooksDto } from '../dto/create-webhooks.dto';

@Injectable()
export class CreateWebhooksService {
  constructor(
    @InjectRepository(Webhooks)
    private readonly repository: Repository<Webhooks>,
  ) {}

  async execute(dto: CreateWebhooksDto, organizationId: string): Promise<Webhooks> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
