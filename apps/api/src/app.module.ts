import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from './config.js';
import { HealthModule } from './health/health.module.js';

@Global()
@Module({
  imports: [HealthModule],
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class AppModule {}
