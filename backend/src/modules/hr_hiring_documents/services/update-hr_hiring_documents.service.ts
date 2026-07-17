import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringDocuments } from '../entities/hr_hiring_documents.entity';
import { UpdateHrHiringDocumentsDto } from '../dto/update-hr_hiring_documents.dto';

@Injectable()
export class UpdateHrHiringDocumentsService {
  constructor(
    @InjectRepository(HrHiringDocuments)
    private readonly repository: Repository<HrHiringDocuments>,
  ) {}

  async execute(id: string, dto: UpdateHrHiringDocumentsDto, organizationId: string): Promise<HrHiringDocuments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
