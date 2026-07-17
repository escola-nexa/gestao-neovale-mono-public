import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormativeTracks } from '../entities/formative_tracks.entity';
import { CreateFormativeTracksDto } from '../dto/create-formative_tracks.dto';

@Injectable()
export class CreateFormativeTracksService {
  constructor(
    @InjectRepository(FormativeTracks)
    private readonly repository: Repository<FormativeTracks>,
  ) {}

  async execute(dto: CreateFormativeTracksDto, organizationId: string): Promise<FormativeTracks> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
