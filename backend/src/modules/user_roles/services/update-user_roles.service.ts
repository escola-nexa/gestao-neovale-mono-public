import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoles } from '../entities/user_roles.entity';
import { UpdateUserRolesDto } from '../dto/update-user_roles.dto';

@Injectable()
export class UpdateUserRolesService {
  constructor(
    @InjectRepository(UserRoles)
    private readonly repository: Repository<UserRoles>,
  ) {}

  async execute(id: string, dto: UpdateUserRolesDto, organizationId: string): Promise<UserRoles> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
