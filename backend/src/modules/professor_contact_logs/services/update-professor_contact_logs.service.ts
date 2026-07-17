import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorContactLogs } from '../entities/professor_contact_logs.entity';
import { UpdateProfessorContactLogsDto } from '../dto/update-professor_contact_logs.dto';

@Injectable()
export class UpdateProfessorContactLogsService {
  constructor(
    @InjectRepository(ProfessorContactLogs)
    private readonly repository: Repository<ProfessorContactLogs>,
  ) {}

  async execute(id: string, dto: UpdateProfessorContactLogsDto, organizationId: string): Promise<ProfessorContactLogs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
