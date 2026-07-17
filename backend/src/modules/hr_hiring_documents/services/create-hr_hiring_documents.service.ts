import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrHiringDocuments } from '../entities/hr_hiring_documents.entity';
import { CreateHrHiringDocumentsDto } from '../dto/create-hr_hiring_documents.dto';

@Injectable()
export class CreateHrHiringDocumentsService {
  constructor(
    @InjectRepository(HrHiringDocuments)
    private readonly repository: Repository<HrHiringDocuments>,
  ) {}

  async execute(dto: CreateHrHiringDocumentsDto, organizationId: string): Promise<HrHiringDocuments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
