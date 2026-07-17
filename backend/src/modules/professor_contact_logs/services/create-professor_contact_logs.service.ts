import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorContactLogs } from '../entities/professor_contact_logs.entity';
import { CreateProfessorContactLogsDto } from '../dto/create-professor_contact_logs.dto';

@Injectable()
export class CreateProfessorContactLogsService {
  constructor(
    @InjectRepository(ProfessorContactLogs)
    private readonly repository: Repository<ProfessorContactLogs>,
  ) {}

  async execute(dto: CreateProfessorContactLogsDto, organizationId: string): Promise<ProfessorContactLogs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
