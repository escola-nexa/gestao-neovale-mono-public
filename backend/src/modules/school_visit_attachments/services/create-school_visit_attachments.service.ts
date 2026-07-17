import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitAttachments } from '../entities/school_visit_attachments.entity';
import { CreateSchoolVisitAttachmentsDto } from '../dto/create-school_visit_attachments.dto';

@Injectable()
export class CreateSchoolVisitAttachmentsService {
  constructor(
    @InjectRepository(SchoolVisitAttachments)
    private readonly repository: Repository<SchoolVisitAttachments>,
  ) {}

  async execute(dto: CreateSchoolVisitAttachmentsDto, organizationId: string): Promise<SchoolVisitAttachments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
