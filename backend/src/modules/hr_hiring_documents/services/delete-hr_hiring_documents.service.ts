import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringDocuments } from '../entities/hr_hiring_documents.entity';

@Injectable()
export class DeleteHrHiringDocumentsService {
  constructor(
    @InjectRepository(HrHiringDocuments)
    private readonly repository: Repository<HrHiringDocuments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
