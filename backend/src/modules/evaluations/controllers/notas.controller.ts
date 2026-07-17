import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { EvaluationsService } from '../services/evaluations.service';

@Controller('notas')
@UseGuards(JwtAuthGuard)
export class NotasController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  async fetchGrades(@Query() query: any, @CurrentUser() user: any) {
    return this.evaluationsService.fetchGrades({
      organizationId: user.organizationId || user.id,
      ...query,
    });
  }

  @Post('config')
  async saveConfig(@Body() body: any) {
    return this.evaluationsService.saveConfig(body);
  }

  @Put('config/:id')
  async updateConfig(@Param('id') id: string, @Body() body: any) {
    return this.evaluationsService.updateConfig({ configId: id, ...body });
  }

  @Post('config/:id/close')
  async closeConfig(@Param('id') id: string, @Body() body: any) {
    return this.evaluationsService.closeGrades({ configId: id, ...body });
  }

  @Post('grades')
  async saveGrades(@Body() body: any) {
    return this.evaluationsService.saveGrades(body);
  }

  @Get('subjects-status')
  async getSubjectsStatus(@Query() query: any) {
    return this.evaluationsService.getSubjectsWithStatus(query);
  }

  @Get('closed-configs')
  async getClosedConfigs(@Query() query: any, @CurrentUser() user: any) {
    return this.evaluationsService.getClosedGradeConfigs({
      organizationId: user.organizationId || user.id,
      ...query,
    });
  }

  @Get('matrix')
  async getMatrix(@Query() query: any) {
    return this.evaluationsService.getGradesMatrix(query);
  }
}
