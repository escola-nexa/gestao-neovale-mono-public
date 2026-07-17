import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoles } from '../entities/user_roles.entity';

@Injectable()
export class FindUserRolesService {
  constructor(
    @InjectRepository(UserRoles)
    private readonly repository: Repository<UserRoles>,
  ) {}

  async findAll(organizationId: string): Promise<UserRoles[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<UserRoles | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
