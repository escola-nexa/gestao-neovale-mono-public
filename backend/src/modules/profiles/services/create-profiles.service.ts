import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profiles } from '../entities/profiles.entity';
import { CreateProfilesDto } from '../dto/create-profiles.dto';

@Injectable()
export class CreateProfilesService {
  constructor(
    @InjectRepository(Profiles)
    private readonly repository: Repository<Profiles>,
  ) {}

  async execute(dto: CreateProfilesDto, organizationId: string): Promise<Profiles> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
