import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module.js';
import { HealthModule } from './health/health.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { IamModule } from './modules/iam/iam.module.js';
import { InstitutionsModule } from './modules/institutions/institutions.module.js';
import { PeopleModule } from './modules/people/people.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { TerritoriesModule } from './modules/territories/territories.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';

@Module({
  imports: [CoreModule, HealthModule, IamModule, TerritoriesModule, WorkflowModule, InstitutionsModule, PeopleModule, ReportingModule, AuditModule],
})
export class AppModule {}
