import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionRequests } from '../entities/teacher_substitution_requests.entity';
import { CreateTeacherSubstitutionRequestsDto } from '../dto/create-teacher_substitution_requests.dto';

@Injectable()
export class CreateTeacherSubstitutionRequestsService {
  constructor(
    @InjectRepository(TeacherSubstitutionRequests)
    private readonly repository: Repository<TeacherSubstitutionRequests>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionRequestsDto, organizationId: string): Promise<TeacherSubstitutionRequests> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
