import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { RhService } from '../services/rh.service';

@Controller('teacher-substitutions')
@UseGuards(JwtAuthGuard)
export class TeacherSubstitutionsController {
  constructor(private readonly rhService: RhService) {}

  @Get('settings/:orgId')
  async getSettings(@Param('orgId') orgId: string) {
    return { data: {} };
  }

  @Post()
  async createRequest(@Body() body: any) {
    return { data: {} };
  }

  @Get(':id')
  async getRequest(@Param('id') id: string) {
    return { data: {} };
  }

  @Patch(':id')
  async updateRequest(@Param('id') id: string, @Body() body: any) {
    return { data: {} };
  }

  // Adding generic catch-all style for the demo
  @Post(':id/:action')
  async doAction(@Param('id') id: string, @Param('action') action: string, @Body() body: any) {
    return { data: { success: true, action, id } };
  }
}
