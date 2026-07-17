import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('students')
export class Students {
  @Column({ name: 'codigo_matricula', type: 'varchar' })
  codigoMatricula: string;

  @Column({ name: 'contato_responsavel', type: 'varchar', nullable: true })
  contatoResponsavel: string;

  @Column({ name: 'cpf', type: 'varchar', nullable: true })
  cpf: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'data_nascimento', type: 'varchar', nullable: true })
  dataNascimento: string;

  @Column({ name: 'educacao_especial', type: 'boolean' })
  educacaoEspecial: boolean;

  @Column({ name: 'educacao_especial_descricao', type: 'varchar', nullable: true })
  educacaoEspecialDescricao: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string;

  @Column({ name: 'email_responsavel', type: 'varchar', nullable: true })
  emailResponsavel: string;

  @Column({ name: 'endereco_bairro', type: 'varchar', nullable: true })
  enderecoBairro: string;

  @Column({ name: 'endereco_cep', type: 'varchar', nullable: true })
  enderecoCep: string;

  @Column({ name: 'endereco_estado', type: 'varchar', nullable: true })
  enderecoEstado: string;

  @Column({ name: 'endereco_municipio', type: 'varchar', nullable: true })
  enderecoMunicipio: string;

  @Column({ name: 'endereco_numero', type: 'varchar', nullable: true })
  enderecoNumero: string;

  @Column({ name: 'endereco_rua', type: 'varchar', nullable: true })
  enderecoRua: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nacionalidade', type: 'varchar' })
  nacionalidade: string;

  @Column({ name: 'nome_completo', type: 'varchar' })
  nomeCompleto: string;

  @Column({ name: 'nome_mae', type: 'varchar', nullable: true })
  nomeMae: string;

  @Column({ name: 'nome_pai', type: 'varchar', nullable: true })
  nomePai: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'orgao_expedidor', type: 'varchar', nullable: true })
  orgaoExpedidor: string;

  @Column({ name: 'rg', type: 'varchar', nullable: true })
  rg: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'whatsapp', type: 'varchar', nullable: true })
  whatsapp: string;

}
