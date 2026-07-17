import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitAttachments } from '../entities/school_visit_attachments.entity';

@Injectable()
export class FindSchoolVisitAttachmentsService {
  constructor(
    @InjectRepository(SchoolVisitAttachments)
    private readonly repository: Repository<SchoolVisitAttachments>,
  ) {}

  async findAll(organizationId: string): Promise<SchoolVisitAttachments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SchoolVisitAttachments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
