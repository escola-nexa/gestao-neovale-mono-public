import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollments } from '../entities/enrollments.entity';

@Injectable()
export class DeleteEnrollmentsService {
  constructor(
    @InjectRepository(Enrollments)
    private readonly repository: Repository<Enrollments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
