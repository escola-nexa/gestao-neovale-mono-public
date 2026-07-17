import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionDocuments } from '../entities/substitution_documents.entity';
import { UpdateSubstitutionDocumentsDto } from '../dto/update-substitution_documents.dto';

@Injectable()
export class UpdateSubstitutionDocumentsService {
  constructor(
    @InjectRepository(SubstitutionDocuments)
    private readonly repository: Repository<SubstitutionDocuments>,
  ) {}

  async execute(id: string, dto: UpdateSubstitutionDocumentsDto, organizationId: string): Promise<SubstitutionDocuments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
