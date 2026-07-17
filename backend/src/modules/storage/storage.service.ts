import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private minioClient: Minio.Client;
  private readonly logger = new Logger(StorageService.name);

  onModuleInit() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ROOT_USER || 'admin',
      secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio_password',
    });
    this.logger.log(`MinIO Client initialized: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
  }

  async uploadFile(bucket: string, path: string, fileBuffer: Buffer, mimetype: string) {
    const minioBucket = bucket.replace(/_/g, '-');
    await this.ensureBucketExists(minioBucket);
    return this.minioClient.putObject(minioBucket, path, fileBuffer, fileBuffer.length, {
      'Content-Type': mimetype,
    });
  }

  async getPublicUrl(bucket: string, path: string) {
    const minioBucket = bucket.replace(/_/g, '-');
    return this.createSignedUrl(minioBucket, path, 604800); // 7 days (max for some S3)
  }

  async createSignedUrl(bucket: string, path: string, expiresIn: number) {
    const minioBucket = bucket.replace(/_/g, '-');
    return this.minioClient.presignedGetObject(minioBucket, path, expiresIn);
  }

  async removeFiles(bucket: string, paths: string[]) {
    const minioBucket = bucket.replace(/_/g, '-');
    return this.minioClient.removeObjects(minioBucket, paths);
  }

  async downloadFile(bucket: string, path: string) {
    const minioBucket = bucket.replace(/_/g, '-');
    return this.minioClient.getObject(minioBucket, path);
  }

  private async ensureBucketExists(minioBucket: string) {
    const exists = await this.minioClient.bucketExists(minioBucket);
    if (!exists) {
      await this.minioClient.makeBucket(minioBucket, 'us-east-1');
      // Ideally set bucket policy to public if needed
    }
  }
}
