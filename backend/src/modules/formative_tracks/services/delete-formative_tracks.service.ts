import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormativeTracks } from '../entities/formative_tracks.entity';

@Injectable()
export class DeleteFormativeTracksService {
  constructor(
    @InjectRepository(FormativeTracks)
    private readonly repository: Repository<FormativeTracks>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
