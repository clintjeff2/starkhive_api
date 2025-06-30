import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as multer from 'multer';

@Injectable()
export class CertificateUploadService {
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async uploadCertificate(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    const key = `certificates/${userId}/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
    };

    const result = await this.s3.upload(params).promise();
    return result.Location;
  }

  async deleteCertificate(url: string): Promise<void> {
    const key = this.extractKeyFromUrl(url);

    const params = {
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
    };

    await this.s3.deleteObject(params).promise();
  }

  private extractKeyFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/');
  }
}
