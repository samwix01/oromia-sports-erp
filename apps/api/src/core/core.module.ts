import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from '../config.js';
import { DbService } from '../db/db.service.js';
import { AuditService } from './audit.service.js';

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }, DbService, AuditService],
  exports: [APP_CONFIG, DbService, AuditService],
})
export class CoreModule {}
