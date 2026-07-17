import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionPayments } from '../entities/teacher_substitution_payments.entity';

@Injectable()
export class FindTeacherSubstitutionPaymentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionPayments)
    private readonly repository: Repository<TeacherSubstitutionPayments>,
  ) {}

  async findAll(organizationId: string): Promise<TeacherSubstitutionPayments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TeacherSubstitutionPayments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
