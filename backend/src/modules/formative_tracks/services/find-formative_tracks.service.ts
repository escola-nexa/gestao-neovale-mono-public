import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormativeTracks } from '../entities/formative_tracks.entity';

@Injectable()
export class FindFormativeTracksService {
  constructor(
    @InjectRepository(FormativeTracks)
    private readonly repository: Repository<FormativeTracks>,
  ) {}

  async findAll(organizationId: string): Promise<FormativeTracks[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FormativeTracks | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
