import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionPayments } from '../entities/teacher_substitution_payments.entity';
import { UpdateTeacherSubstitutionPaymentsDto } from '../dto/update-teacher_substitution_payments.dto';

@Injectable()
export class UpdateTeacherSubstitutionPaymentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionPayments)
    private readonly repository: Repository<TeacherSubstitutionPayments>,
  ) {}

  async execute(id: string, dto: UpdateTeacherSubstitutionPaymentsDto, organizationId: string): Promise<TeacherSubstitutionPayments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
