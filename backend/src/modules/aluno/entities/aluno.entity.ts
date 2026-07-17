import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('students')
export class Aluno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'nome_completo' })
  nomeCompleto: string;

  @Column({ name: 'data_nascimento', nullable: true })
  dataNascimento: string;

  @Column({ name: 'codigo_matricula' })
  codigoMatricula: string;

  @Column({ nullable: true })
  cpf: string;

  @Column({ nullable: true })
  rg: string;

  @Column({ name: 'orgao_expedidor', nullable: true })
  orgaoExpedidor: string;

  @Column()
  nacionalidade: string;

  @Column({ name: 'educacao_especial' })
  educacaoEspecial: boolean;

  @Column({ name: 'educacao_especial_descricao', nullable: true })
  educacaoEspecialDescricao: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'endereco_rua', nullable: true })
  enderecoRua: string;

  @Column({ name: 'endereco_numero', nullable: true })
  enderecoNumero: string;

  @Column({ name: 'endereco_bairro', nullable: true })
  enderecoBairro: string;

  @Column({ name: 'endereco_cep', nullable: true })
  enderecoCep: string;

  @Column({ name: 'endereco_municipio', nullable: true })
  enderecoMunicipio: string;

  @Column({ name: 'endereco_estado', nullable: true })
  enderecoEstado: string;

  @Column({ name: 'nome_mae', nullable: true })
  nomeMae: string;

  @Column({ name: 'nome_pai', nullable: true })
  nomePai: string;

  @Column({ name: 'contato_responsavel', nullable: true })
  contatoResponsavel: string;

  @Column({ name: 'email_responsavel', nullable: true })
  emailResponsavel: string;

  @Column()
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
