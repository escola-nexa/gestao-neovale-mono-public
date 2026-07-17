import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('schools')
export class Schools {
  @Column({ name: 'cidade', type: 'varchar' })
  cidade: string;

  @Column({ name: 'codigo', type: 'varchar' })
  codigo: string;

  @Column({ name: 'coordenador_pedagogico', type: 'varchar', nullable: true })
  coordenadorPedagogico: string;

  @Column({ name: 'coordenador_pedagogico_email', type: 'varchar', nullable: true })
  coordenadorPedagogicoEmail: string;

  @Column({ name: 'coordenador_pedagogico_telefone', type: 'varchar', nullable: true })
  coordenadorPedagogicoTelefone: string;

  @Column({ name: 'coordenador_pedagogico_turno', type: 'varchar', nullable: true })
  coordenadorPedagogicoTurno: string;

  @Column({ name: 'cre', type: 'varchar', nullable: true })
  cre: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'diretor', type: 'varchar' })
  diretor: string;

  @Column({ name: 'diretor_adjunto', type: 'varchar', nullable: true })
  diretorAdjunto: string;

  @Column({ name: 'diretor_adjunto_email', type: 'varchar', nullable: true })
  diretorAdjuntoEmail: string;

  @Column({ name: 'diretor_adjunto_telefone', type: 'varchar', nullable: true })
  diretorAdjuntoTelefone: string;

  @Column({ name: 'diretor_email', type: 'varchar', nullable: true })
  diretorEmail: string;

  @Column({ name: 'diretor_telefone', type: 'varchar', nullable: true })
  diretorTelefone: string;

  @Column({ name: 'email', type: 'varchar' })
  email: string;

  @Column({ name: 'endereco', type: 'varchar' })
  endereco: string;

  @Column({ name: 'endereco_bairro', type: 'varchar', nullable: true })
  enderecoBairro: string;

  @Column({ name: 'endereco_cep', type: 'varchar', nullable: true })
  enderecoCep: string;

  @Column({ name: 'endereco_numero', type: 'varchar', nullable: true })
  enderecoNumero: string;

  @Column({ name: 'endereco_rua', type: 'varchar', nullable: true })
  enderecoRua: string;

  @Column({ name: 'geocoded_at', type: 'varchar', nullable: true })
  geocodedAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lat', type: 'numeric', nullable: true })
  lat: number;

  @Column({ name: 'lng', type: 'numeric', nullable: true })
  lng: number;

  @Column({ name: 'nome', type: 'varchar' })
  nome: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'supervisor_tecnico_1', type: 'varchar', nullable: true })
  supervisorTecnico_1: string;

  @Column({ name: 'supervisor_tecnico_1_email', type: 'varchar', nullable: true })
  supervisorTecnico_1Email: string;

  @Column({ name: 'supervisor_tecnico_1_telefone', type: 'varchar', nullable: true })
  supervisorTecnico_1Telefone: string;

  @Column({ name: 'supervisor_tecnico_1_turno', type: 'varchar', nullable: true })
  supervisorTecnico_1Turno: string;

  @Column({ name: 'supervisor_tecnico_2', type: 'varchar', nullable: true })
  supervisorTecnico_2: string;

  @Column({ name: 'supervisor_tecnico_2_email', type: 'varchar', nullable: true })
  supervisorTecnico_2Email: string;

  @Column({ name: 'supervisor_tecnico_2_telefone', type: 'varchar', nullable: true })
  supervisorTecnico_2Telefone: string;

  @Column({ name: 'supervisor_tecnico_2_turno', type: 'varchar', nullable: true })
  supervisorTecnico_2Turno: string;

  @Column({ name: 'supervisor_tecnico_3', type: 'varchar', nullable: true })
  supervisorTecnico_3: string;

  @Column({ name: 'supervisor_tecnico_3_email', type: 'varchar', nullable: true })
  supervisorTecnico_3Email: string;

  @Column({ name: 'supervisor_tecnico_3_telefone', type: 'varchar', nullable: true })
  supervisorTecnico_3Telefone: string;

  @Column({ name: 'supervisor_tecnico_3_turno', type: 'varchar', nullable: true })
  supervisorTecnico_3Turno: string;

  @Column({ name: 'telefone', type: 'varchar' })
  telefone: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
