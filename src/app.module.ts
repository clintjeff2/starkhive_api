import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { Message } from './messaging/entities/message.entity';
import { FeedModule } from './feed/feed.module';
import { PostModule } from './post/post.module';
import * as dotenv from 'dotenv';
import { SavedPost } from './feed/entities/savedpost.entity';
import { Post } from './post/entities/post.entity';
import { MessagingModule } from './messaging/messaging.module';

import { JobModule } from './jobs/jobs.module';
import { AntiSpamModule } from './anti-spam/anti-spam.module';
import { Application } from './applications/entities/application.entity';
import { ApplicationsModule } from './applications/applications.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { Comment } from './feed/entities/comment.entity';
// import { Job } from './jobs/entities/job.entity';
import { Portfolio } from './auth/entities/portfolio.entity';
import { Report } from './reports/entities/report.entity';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

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
        type: 'postgres', // Force postgres, no fallback to sqlite
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') || '5432', 10), // default postgres port
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          User,
          SavedPost,
          Post,
          Application,
          Message,
          Comment,
          Job,
          Portfolio,
          Report,
        ],
        synchronize: true, // or false in production
      }),
    }),
    AuthModule,
    MessagingModule,
    FeedModule,
    PostModule,
    JobModule,
    AntiSpamModule,
    MessagingModule,
    AdminModule,
    ReportsModule,
    ApplicationsModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60 * 1000, // 1 minute in ms
          limit: 100,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: require('./auth/guards/rate-limit.guard').RateLimitGuard,
    },
  ],
})
export class AppModule {}
