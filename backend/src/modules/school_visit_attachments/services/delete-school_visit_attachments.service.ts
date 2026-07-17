import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitAttachments } from '../entities/school_visit_attachments.entity';

@Injectable()
export class DeleteSchoolVisitAttachmentsService {
  constructor(
    @InjectRepository(SchoolVisitAttachments)
    private readonly repository: Repository<SchoolVisitAttachments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
