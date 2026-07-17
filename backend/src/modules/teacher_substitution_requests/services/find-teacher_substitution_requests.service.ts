import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionRequests } from '../entities/teacher_substitution_requests.entity';

@Injectable()
export class FindTeacherSubstitutionRequestsService {
  constructor(
    @InjectRepository(TeacherSubstitutionRequests)
    private readonly repository: Repository<TeacherSubstitutionRequests>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionRequests[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionRequests | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
