import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('library_content_folders')
export class LibraryContentFolders {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_id', type: 'varchar' })
  contentId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'folder_id', type: 'varchar' })
  folderId: string;

  @Column({ name: 'sort_order', type: 'numeric' })
  sortOrder: number;

}
