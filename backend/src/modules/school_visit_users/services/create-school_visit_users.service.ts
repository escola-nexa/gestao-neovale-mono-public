import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitUsers } from '../entities/school_visit_users.entity';
import { CreateSchoolVisitUsersDto } from '../dto/create-school_visit_users.dto';

@Injectable()
export class CreateSchoolVisitUsersService {
  constructor(
    @InjectRepository(SchoolVisitUsers)
    private readonly repository: Repository<SchoolVisitUsers>,
  ) {}

  async execute(dto: CreateSchoolVisitUsersDto, organizationId: string): Promise<SchoolVisitUsers> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
