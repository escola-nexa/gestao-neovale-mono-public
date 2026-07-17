import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orientations } from '../entities/orientations.entity';
import { CreateOrientationsDto } from '../dto/create-orientations.dto';

@Injectable()
export class CreateOrientationsService {
  constructor(
    @InjectRepository(Orientations)
    private readonly repository: Repository<Orientations>,
  ) {}

  async execute(dto: CreateOrientationsDto, organizationId: string): Promise<Orientations> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
