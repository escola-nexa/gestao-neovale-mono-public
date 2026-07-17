import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('digital_signatures')
export class DigitalSignatures {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ name: 'latitude', type: 'numeric' })
  latitude: number;

  @Column({ name: 'longitude', type: 'numeric' })
  longitude: number;

  @Column({ name: 'photo_url', type: 'varchar' })
  photoUrl: string;

  @Column({ name: 'planning_id', type: 'varchar' })
  planningId: string;

  @Column({ name: 'signature_type', type: 'varchar' })
  signatureType: string;

  @Column({ name: 'signed_at', type: 'varchar' })
  signedAt: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
