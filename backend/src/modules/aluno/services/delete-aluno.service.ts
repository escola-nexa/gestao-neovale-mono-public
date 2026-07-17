import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aluno } from '../entities/aluno.entity';

@Injectable()
export class DeleteAlunoService {
  constructor(
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const result = await this.alunoRepository.delete({ id, organizationId });
    
    if (result.affected === 0) {
      throw new NotFoundException('Aluno não encontrado');
    }
  }
}
