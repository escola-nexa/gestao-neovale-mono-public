import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { RhService } from '../services/rh.service';

@Controller('rh')
@UseGuards(JwtAuthGuard)
export class RhGeneralController {
  constructor(private readonly rhService: RhService) {}

  @Get('settings')
  async getSettings(@Query('organization_id') orgId: string, @CurrentUser() user: any) {
    return this.rhService.getSettings(orgId || user.organizationId || user.id);
  }

  @Post('settings')
  async saveSettings(@Body() body: any) {
    return this.rhService.saveSettings(body);
  }

  @Get('overrides')
  async getOverrides(@Query('organization_id') orgId: string, @CurrentUser() user: any) {
    return this.rhService.getOverrides(orgId || user.organizationId || user.id);
  }

  @Post('overrides')
  async saveOverride(@Body() body: any) {
    return this.rhService.saveOverride(body);
  }

  @Delete('overrides/:subjectId')
  async deleteOverride(@Param('subjectId') subjectId: string) {
    return this.rhService.deleteOverride(subjectId);
  }

  @Get('eligible-professors')
  async getEligibleProfessors(@Query('schoolId') schoolId: string, @Query('courseId') courseId: string) {
    return this.rhService.getEligibleProfessors(schoolId, courseId);
  }

  @Get('workload')
  async getWorkload(@Query('organization_id') orgId: string, @CurrentUser() user: any) {
    return this.rhService.getWorkload(orgId || user.organizationId || user.id);
  }

  @Get('curriculum-coverage')
  async getCurriculumCoverage(@Query() query: any) {
    return this.rhService.getCurriculumCoverage(query);
  }

  @Get('teacher-shift-workload')
  async getTeacherShiftWorkload(@Query('organizationId') orgId: string, @Query('professorIds') professorIds: string, @CurrentUser() user: any) {
    return this.rhService.getTeacherShiftWorkload(orgId || user.organizationId || user.id, professorIds);
  }

  @Get('subjects/all')
  async getAllSubjects() {
    return this.rhService.getAllSubjects();
  }

  @Get('talents')
  async getTalents() {
    return this.rhService.getTalents();
  }
}
