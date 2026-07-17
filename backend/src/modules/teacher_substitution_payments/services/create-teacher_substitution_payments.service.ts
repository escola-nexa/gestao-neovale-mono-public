import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionPayments } from '../entities/teacher_substitution_payments.entity';
import { CreateTeacherSubstitutionPaymentsDto } from '../dto/create-teacher_substitution_payments.dto';

@Injectable()
export class CreateTeacherSubstitutionPaymentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionPayments)
    private readonly repository: Repository<TeacherSubstitutionPayments>,
  ) {}

  async execute(dto: CreateTeacherSubstitutionPaymentsDto, organizationId: string): Promise<TeacherSubstitutionPayments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
