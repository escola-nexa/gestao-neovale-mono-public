import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitParticipants } from '../entities/school_visit_participants.entity';
import { CreateSchoolVisitParticipantsDto } from '../dto/create-school_visit_participants.dto';

@Injectable()
export class CreateSchoolVisitParticipantsService {
  constructor(
    @InjectRepository(SchoolVisitParticipants)
    private readonly repository: Repository<SchoolVisitParticipants>,
  ) {}

  async execute(dto: CreateSchoolVisitParticipantsDto, organizationId: string): Promise<SchoolVisitParticipants> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
