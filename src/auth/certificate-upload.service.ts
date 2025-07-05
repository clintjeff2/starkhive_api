import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// If aws-sdk is not installed, comment out the import and any usage of AWS for now.
// import * as AWS from 'aws-sdk';

@Injectable()
export class CertificateUploadService {
  // Comment out or remove all usage of AWS and related code if aws-sdk is not installed.
  // private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    // If aws-sdk is not installed, comment out the constructor and any usage of AWS for now.
    // this.s3 = new AWS.S3({
    //   accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
    //   secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    //   region: this.configService.get('AWS_REGION'),
    // });
  }

  uploadCertificate(): string {
    // Not implemented: S3 upload
    return '';
  }

  deleteCertificate(): void {
    // Not implemented: S3 delete
  }

  private extractKeyFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/');
  }
}
