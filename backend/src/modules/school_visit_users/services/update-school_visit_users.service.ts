import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitUsers } from '../entities/school_visit_users.entity';
import { UpdateSchoolVisitUsersDto } from '../dto/update-school_visit_users.dto';

@Injectable()
export class UpdateSchoolVisitUsersService {
  constructor(
    @InjectRepository(SchoolVisitUsers)
    private readonly repository: Repository<SchoolVisitUsers>,
  ) {}

  async execute(id: string, dto: UpdateSchoolVisitUsersDto, organizationId: string): Promise<SchoolVisitUsers> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
