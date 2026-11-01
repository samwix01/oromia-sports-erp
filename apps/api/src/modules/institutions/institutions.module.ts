import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/public-api.js';
import { InstitutionsDirectoryModule } from './directory.module.js';
import { InstitutionsController } from './institutions.controller.js';

@Module({ imports: [InstitutionsDirectoryModule, WorkflowModule], controllers: [InstitutionsController] })
export class InstitutionsModule {}
