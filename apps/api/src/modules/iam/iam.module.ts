import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InstitutionsDirectoryModule } from '../institutions/public-api.js';
import { TerritoriesModule } from '../territories/public-api.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [InstitutionsDirectoryModule, TerritoriesModule],
  controllers: [AuthController, UsersController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class IamModule {}
