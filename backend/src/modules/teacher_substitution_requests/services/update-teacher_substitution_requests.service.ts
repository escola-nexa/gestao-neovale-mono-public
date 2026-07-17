import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionRequests } from '../entities/teacher_substitution_requests.entity';
import { UpdateTeacherSubstitutionRequestsDto } from '../dto/update-teacher_substitution_requests.dto';

@Injectable()
export class UpdateTeacherSubstitutionRequestsService {
  constructor(
    @InjectRepository(TeacherSubstitutionRequests)
    private readonly repository: Repository<TeacherSubstitutionRequests>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionRequestsDto, organizationId: string): Promise<TeacherSubstitutionRequests> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
