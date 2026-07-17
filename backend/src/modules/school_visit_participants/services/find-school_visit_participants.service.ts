import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitParticipants } from '../entities/school_visit_participants.entity';

@Injectable()
export class FindSchoolVisitParticipantsService {
  constructor(
    @InjectRepository(SchoolVisitParticipants)
    private readonly repository: Repository<SchoolVisitParticipants>,
  ) {}

  async findAll(organizationId: string): Promise<SchoolVisitParticipants[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<SchoolVisitParticipants | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
