import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subjects } from '../entities/subjects.entity';
import { CreateSubjectsDto } from '../dto/create-subjects.dto';

@Injectable()
export class CreateSubjectsService {
  constructor(
    @InjectRepository(Subjects)
    private readonly repository: Repository<Subjects>,
  ) {}

  async execute(dto: CreateSubjectsDto, organizationId: string): Promise<Subjects> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
