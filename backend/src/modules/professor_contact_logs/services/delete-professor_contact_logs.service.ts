import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorContactLogs } from '../entities/professor_contact_logs.entity';

@Injectable()
export class DeleteProfessorContactLogsService {
  constructor(
    @InjectRepository(ProfessorContactLogs)
    private readonly repository: Repository<ProfessorContactLogs>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
