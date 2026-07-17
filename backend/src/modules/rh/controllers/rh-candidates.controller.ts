import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { RhService } from '../services/rh.service';

@Controller('rh/hiring-candidates')
@UseGuards(JwtAuthGuard)
export class RhCandidatesController {
  constructor(private readonly rhService: RhService) {}

  @Get()
  async getCandidates(@Query('organization_id') orgId: string, @CurrentUser() user: any) {
    return this.rhService.getCandidates(orgId || user.organizationId || user.id);
  }

  @Get(':id')
  async getCandidateById(@Param('id') id: string) {
    return this.rhService.getCandidateById(id);
  }

  @Post(':id/generate-link')
  async generateLink(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.rhService.generateCandidateLink(id, body.professor_id, body.organization_id || user.organizationId);
  }

  @Post(':id/revoke-link')
  async revokeLink(@Param('id') id: string, @Body() body: any) {
    return this.rhService.revokeCandidateLink(id, body.link_id);
  }

  @Post(':id/cancel')
  async cancelCandidate(@Param('id') id: string, @Body() body: any) {
    return this.rhService.cancelCandidate(id, body.reason);
  }

  @Get(':id/documents')
  async getDocuments(@Param('id') id: string) {
    return this.rhService.getCandidateDocuments(id);
  }

  @Post(':id/documents')
  async uploadDocument(@Param('id') id: string, @Body() body: any) {
    return this.rhService.uploadCandidateDocument(id, body);
  }

  @Delete(':id/documents/:docId')
  async deleteDocument(@Param('id') id: string, @Param('docId') docId: string, @Body() body: any) {
    return this.rhService.deleteCandidateDocument(id, docId, body.file_name);
  }
}
