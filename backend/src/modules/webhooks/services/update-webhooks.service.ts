import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhooks } from '../entities/webhooks.entity';
import { UpdateWebhooksDto } from '../dto/update-webhooks.dto';

@Injectable()
export class UpdateWebhooksService {
  constructor(
    @InjectRepository(Webhooks)
    private readonly repository: Repository<Webhooks>,
  ) {}

  async execute(id: string, dto: UpdateWebhooksDto, organizationId: string): Promise<Webhooks> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
