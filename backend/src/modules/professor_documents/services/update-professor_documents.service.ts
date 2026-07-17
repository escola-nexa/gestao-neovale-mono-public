import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorDocuments } from '../entities/professor_documents.entity';
import { UpdateProfessorDocumentsDto } from '../dto/update-professor_documents.dto';

@Injectable()
export class UpdateProfessorDocumentsService {
  constructor(
    @InjectRepository(ProfessorDocuments)
    private readonly repository: Repository<ProfessorDocuments>,
  ) {}

  async execute(id: string, dto: UpdateProfessorDocumentsDto, organizationId: string): Promise<ProfessorDocuments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
