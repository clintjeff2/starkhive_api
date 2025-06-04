import { Comment } from 'src/feed/entities/comment.entity';
import { SavedPost } from 'src/feed/entities/savedpost.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';

@Entity()
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;


  @OneToMany(() => SavedPost, (savedPost) => savedPost.post)
  savedBy: SavedPost[];

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  

}
