import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormativeTracks } from '../entities/formative_tracks.entity';
import { UpdateFormativeTracksDto } from '../dto/update-formative_tracks.dto';

@Injectable()
export class UpdateFormativeTracksService {
  constructor(
    @InjectRepository(FormativeTracks)
    private readonly repository: Repository<FormativeTracks>,
  ) {}

  async execute(id: string, dto: UpdateFormativeTracksDto, organizationId: string): Promise<FormativeTracks> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
