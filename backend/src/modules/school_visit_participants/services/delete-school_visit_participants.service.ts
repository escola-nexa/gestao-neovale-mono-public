import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitParticipants } from '../entities/school_visit_participants.entity';

@Injectable()
export class DeleteSchoolVisitParticipantsService {
  constructor(
    @InjectRepository(SchoolVisitParticipants)
    private readonly repository: Repository<SchoolVisitParticipants>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
