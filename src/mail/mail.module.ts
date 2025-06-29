import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from '../mail/mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
