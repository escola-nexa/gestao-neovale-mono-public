import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionRequests } from '../entities/teacher_substitution_requests.entity';

@Injectable()
export class DeleteTeacherSubstitutionRequestsService {
  constructor(
    @InjectRepository(TeacherSubstitutionRequests)
    private readonly repository: Repository<TeacherSubstitutionRequests>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
