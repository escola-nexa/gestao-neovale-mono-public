import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitParticipants } from '../entities/school_visit_participants.entity';
import { UpdateSchoolVisitParticipantsDto } from '../dto/update-school_visit_participants.dto';

@Injectable()
export class UpdateSchoolVisitParticipantsService {
  constructor(
    @InjectRepository(SchoolVisitParticipants)
    private readonly repository: Repository<SchoolVisitParticipants>,
  ) {}

  async execute(id: string, dto: UpdateSchoolVisitParticipantsDto, organizationId: string): Promise<SchoolVisitParticipants> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
