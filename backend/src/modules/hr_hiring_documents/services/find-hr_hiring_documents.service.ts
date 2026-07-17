import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringDocuments } from '../entities/hr_hiring_documents.entity';

@Injectable()
export class FindHrHiringDocumentsService {
  constructor(
    @InjectRepository(HrHiringDocuments)
    private readonly repository: Repository<HrHiringDocuments>,
  ) {}

  async findAll(organizationId: string): Promise<HrHiringDocuments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HrHiringDocuments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
