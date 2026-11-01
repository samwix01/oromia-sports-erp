import { Module } from '@nestjs/common';
import { InstitutionsDirectoryModule } from '../institutions/public-api.js';
import { TerritoriesModule } from '../territories/public-api.js';
import { WorkflowController } from './workflow.controller.js';
import { WorkflowService } from './workflow.service.js';

@Module({
  imports: [InstitutionsDirectoryModule, TerritoriesModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
