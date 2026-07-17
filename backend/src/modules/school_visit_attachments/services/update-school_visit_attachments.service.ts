import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitAttachments } from '../entities/school_visit_attachments.entity';
import { UpdateSchoolVisitAttachmentsDto } from '../dto/update-school_visit_attachments.dto';

@Injectable()
export class UpdateSchoolVisitAttachmentsService {
  constructor(
    @InjectRepository(SchoolVisitAttachments)
    private readonly repository: Repository<SchoolVisitAttachments>,
  ) {}

  async execute(id: string, dto: UpdateSchoolVisitAttachmentsDto, organizationId: string): Promise<SchoolVisitAttachments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
