import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoles } from '../entities/user_roles.entity';
import { CreateUserRolesDto } from '../dto/create-user_roles.dto';

@Injectable()
export class CreateUserRolesService {
  constructor(
    @InjectRepository(UserRoles)
    private readonly repository: Repository<UserRoles>,
  ) {}

  async execute(dto: CreateUserRolesDto, organizationId: string): Promise<UserRoles> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
