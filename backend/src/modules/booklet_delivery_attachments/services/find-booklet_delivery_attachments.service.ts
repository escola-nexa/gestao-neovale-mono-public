import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryAttachments } from '../entities/booklet_delivery_attachments.entity';

@Injectable()
export class FindBookletDeliveryAttachmentsService {
  constructor(
    @InjectRepository(BookletDeliveryAttachments)
    private readonly repository: Repository<BookletDeliveryAttachments>,
  ) {}

  async findAll(organizationId: string): Promise<BookletDeliveryAttachments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BookletDeliveryAttachments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
