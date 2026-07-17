import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolVisitUsers } from '../entities/school_visit_users.entity';

@Injectable()
export class DeleteSchoolVisitUsersService {
  constructor(
    @InjectRepository(SchoolVisitUsers)
    private readonly repository: Repository<SchoolVisitUsers>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
