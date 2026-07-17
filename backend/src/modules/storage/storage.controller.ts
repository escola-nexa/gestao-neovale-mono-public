import { Controller, Post, Get, Param, Query, UseInterceptors, UploadedFile, UseGuards, Body, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post(':bucket/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('bucket') bucket: string,
    @Query('path') path: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.storageService.uploadFile(bucket, path, file.buffer, file.mimetype);
    return { success: true, path };
  }

  @Post(':bucket/remove')
  @UseGuards(JwtAuthGuard)
  async removeFiles(
    @Param('bucket') bucket: string,
    @Body('paths') paths: string[],
  ) {
    await this.storageService.removeFiles(bucket, paths);
    return { success: true };
  }

  @Get(':bucket/public-url')
  async getPublicUrl(
    @Param('bucket') bucket: string,
    @Query('path') path: string,
  ) {
    const url = await this.storageService.getPublicUrl(bucket, path);
    return { publicUrl: url };
  }

  @Get(':bucket/signed-url')
  @UseGuards(JwtAuthGuard)
  async createSignedUrl(
    @Param('bucket') bucket: string,
    @Query('path') path: string,
    @Query('expiresIn') expiresIn: string,
  ) {
    const url = await this.storageService.createSignedUrl(bucket, path, parseInt(expiresIn || '3600', 10));
    return { signedUrl: url };
  }

  @Get(':bucket/download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Param('bucket') bucket: string,
    @Query('path') path: string,
  ) {
    const stream = await this.storageService.downloadFile(bucket, path);
    return new StreamableFile(stream);
  }
}
