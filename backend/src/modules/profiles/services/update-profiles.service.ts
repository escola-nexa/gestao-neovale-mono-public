import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profiles } from '../entities/profiles.entity';
import { UpdateProfilesDto } from '../dto/update-profiles.dto';

@Injectable()
export class UpdateProfilesService {
  constructor(
    @InjectRepository(Profiles)
    private readonly repository: Repository<Profiles>,
  ) {}

  async execute(id: string, dto: UpdateProfilesDto, organizationId: string): Promise<Profiles> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
