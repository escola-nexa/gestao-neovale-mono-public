import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionDocuments } from '../entities/substitution_documents.entity';

@Injectable()
export class DeleteSubstitutionDocumentsService {
  constructor(
    @InjectRepository(SubstitutionDocuments)
    private readonly repository: Repository<SubstitutionDocuments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
