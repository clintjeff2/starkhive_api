import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { FeedModule } from './feed/feed.module';
import { PostModule } from './post/post.module';
import * as dotenv from 'dotenv';
import { SavedPost } from './feed/entities/savedpost.entity';
import { Post } from './post/entities/post.entity';
import { UserModule } from './user/user.module';
import { MessagingModule } from './messaging/messaging.module';
import { JobModule } from './jobs/jobs.module';
import { AntiSpamModule } from './anti-spam/anti-spam.module';
import { Application } from './applications/entities/application.entity';
import { ApplicationsModule } from './applications/applications.module';

dotenv.config(); 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: (configService.get<'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mongodb' | 'oracle' | 'mssql' | 'cockroachdb'>('DB_TYPE') || 'sqlite'),
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') || '0', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [User, SavedPost, Post, Application],
        synchronize: true, 
      }),
    }),
    AuthModule,
    FeedModule,
    PostModule,
    UserModule,
    JobModule,
    AntiSpamModule,
    MessagingModule,
    ApplicationsModule,
  ],
})
export class AppModule {}