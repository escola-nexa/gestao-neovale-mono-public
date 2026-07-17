import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryAttachments } from '../entities/booklet_delivery_attachments.entity';
import { CreateBookletDeliveryAttachmentsDto } from '../dto/create-booklet_delivery_attachments.dto';

@Injectable()
export class CreateBookletDeliveryAttachmentsService {
  constructor(
    @InjectRepository(BookletDeliveryAttachments)
    private readonly repository: Repository<BookletDeliveryAttachments>,
  ) {}

  async execute(dto: CreateBookletDeliveryAttachmentsDto, organizationId: string): Promise<BookletDeliveryAttachments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
