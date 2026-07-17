import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryAttachments } from '../entities/booklet_delivery_attachments.entity';
import { UpdateBookletDeliveryAttachmentsDto } from '../dto/update-booklet_delivery_attachments.dto';

@Injectable()
export class UpdateBookletDeliveryAttachmentsService {
  constructor(
    @InjectRepository(BookletDeliveryAttachments)
    private readonly repository: Repository<BookletDeliveryAttachments>,
  ) {}

  async execute(id: string, dto: UpdateBookletDeliveryAttachmentsDto, organizationId: string): Promise<BookletDeliveryAttachments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
