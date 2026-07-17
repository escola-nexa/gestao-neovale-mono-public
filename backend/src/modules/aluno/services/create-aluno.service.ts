import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aluno } from '../entities/aluno.entity';
import { CreateAlunoDto } from '../dto/create-aluno.dto';

@Injectable()
export class CreateAlunoService {
  constructor(
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
  ) {}

  async execute(dto: CreateAlunoDto, organizationId: string): Promise<Aluno> {
    try {
      const aluno = this.alunoRepository.create({
        organizationId,
        nomeCompleto: dto.nome_completo,
        dataNascimento: dto.data_nascimento,
        codigoMatricula: dto.codigo_matricula,
        cpf: dto.cpf,
        rg: dto.rg,
        orgaoExpedidor: dto.orgao_expedidor,
        nacionalidade: dto.nacionalidade,
        educacaoEspecial: dto.educacao_especial,
        educacaoEspecialDescricao: dto.educacao_especial_descricao,
        whatsapp: dto.whatsapp,
        email: dto.email,
        enderecoRua: dto.endereco_rua,
        enderecoNumero: dto.endereco_numero,
        enderecoBairro: dto.endereco_bairro,
        enderecoCep: dto.endereco_cep,
        enderecoMunicipio: dto.endereco_municipio,
        enderecoEstado: dto.endereco_estado,
        nomeMae: dto.nome_mae,
        nomePai: dto.nome_pai,
        contatoResponsavel: dto.contato_responsavel,
        emailResponsavel: dto.email_responsavel,
        status: dto.status,
      });
      
      return await this.alunoRepository.save(aluno);
    } catch (error: any) {
      if (error.code === '23505') {
        if (error.constraint?.includes('cpf')) {
          throw new BadRequestException('students_org_cpf_unique');
        }
        if (error.constraint?.includes('codigo_matricula')) {
          throw new BadRequestException('students_organization_id_codigo_matricula_key');
        }
      }
      throw error;
    }
  }
}
