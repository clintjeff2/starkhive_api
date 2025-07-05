import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio;
  private from: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.configService.get<string>('TWILIO_FROM');
    if (!accountSid || !authToken || !from) {
      throw new Error('Twilio configuration is missing');
    }
    this.from = from;
    this.client = new Twilio(accountSid, authToken);
  }

  async sendSms(to: string, body: string): Promise<boolean> {
    try {
      await this.client.messages.create({
        body,
        from: this.from,
        to,
      });
      this.logger.log(`SMS sent to ${to}`);
      return true;
    } catch (error) {
      const errorMsg =
        typeof error === 'object' && error && 'message' in error
          ? (error as { message: string }).message
          : String(error);
      this.logger.error(`Failed to send SMS to ${to}: ${errorMsg}`);
      return false;
    }
  }
}
