import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  full_name: string;

  @Column()
  phone: string;

  @Column()
  stage: string;

  @Column({ nullable: true })
  bitrix_lead_id: number;
}
