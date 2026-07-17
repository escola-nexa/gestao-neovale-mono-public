import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollments } from '../entities/enrollments.entity';
import { UpdateEnrollmentsDto } from '../dto/update-enrollments.dto';

@Injectable()
export class UpdateEnrollmentsService {
  constructor(
    @InjectRepository(Enrollments)
    private readonly repository: Repository<Enrollments>,
  ) {}

  async execute(id: string, dto: UpdateEnrollmentsDto, organizationId: string): Promise<Enrollments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
