import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherSubstitutionPayments } from '../entities/teacher_substitution_payments.entity';

@Injectable()
export class DeleteTeacherSubstitutionPaymentsService {
  constructor(
    @InjectRepository(TeacherSubstitutionPayments)
    private readonly repository: Repository<TeacherSubstitutionPayments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
