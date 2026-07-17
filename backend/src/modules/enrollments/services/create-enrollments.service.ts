import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollments } from '../entities/enrollments.entity';
import { CreateEnrollmentsDto } from '../dto/create-enrollments.dto';

@Injectable()
export class CreateEnrollmentsService {
  constructor(
    @InjectRepository(Enrollments)
    private readonly repository: Repository<Enrollments>,
  ) {}

  async execute(dto: CreateEnrollmentsDto, organizationId: string): Promise<Enrollments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
