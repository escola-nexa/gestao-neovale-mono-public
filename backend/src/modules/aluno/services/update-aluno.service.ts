import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aluno } from '../entities/aluno.entity';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';

@Injectable()
export class UpdateAlunoService {
  constructor(
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
  ) {}

  async execute(id: string, dto: UpdateAlunoDto, organizationId: string): Promise<Aluno> {
    const aluno = await this.alunoRepository.findOne({ where: { id, organizationId } });
    
    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    if (dto.nome_completo !== undefined) aluno.nomeCompleto = dto.nome_completo;
    if (dto.data_nascimento !== undefined) aluno.dataNascimento = dto.data_nascimento;
    if (dto.codigo_matricula !== undefined) aluno.codigoMatricula = dto.codigo_matricula;
    if (dto.cpf !== undefined) aluno.cpf = dto.cpf;
    if (dto.rg !== undefined) aluno.rg = dto.rg;
    if (dto.orgao_expedidor !== undefined) aluno.orgaoExpedidor = dto.orgao_expedidor;
    if (dto.nacionalidade !== undefined) aluno.nacionalidade = dto.nacionalidade;
    if (dto.educacao_especial !== undefined) aluno.educacaoEspecial = dto.educacao_especial;
    if (dto.educacao_especial_descricao !== undefined) aluno.educacaoEspecialDescricao = dto.educacao_especial_descricao;
    if (dto.whatsapp !== undefined) aluno.whatsapp = dto.whatsapp;
    if (dto.email !== undefined) aluno.email = dto.email;
    if (dto.endereco_rua !== undefined) aluno.enderecoRua = dto.endereco_rua;
    if (dto.endereco_numero !== undefined) aluno.enderecoNumero = dto.endereco_numero;
    if (dto.endereco_bairro !== undefined) aluno.enderecoBairro = dto.endereco_bairro;
    if (dto.endereco_cep !== undefined) aluno.enderecoCep = dto.endereco_cep;
    if (dto.endereco_municipio !== undefined) aluno.enderecoMunicipio = dto.endereco_municipio;
    if (dto.endereco_estado !== undefined) aluno.enderecoEstado = dto.endereco_estado;
    if (dto.nome_mae !== undefined) aluno.nomeMae = dto.nome_mae;
    if (dto.nome_pai !== undefined) aluno.nomePai = dto.nome_pai;
    if (dto.contato_responsavel !== undefined) aluno.contatoResponsavel = dto.contato_responsavel;
    if (dto.email_responsavel !== undefined) aluno.emailResponsavel = dto.email_responsavel;
    if (dto.status !== undefined) aluno.status = dto.status;

    return await this.alunoRepository.save(aluno);
  }
}
