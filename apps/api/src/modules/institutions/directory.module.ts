import { Module } from '@nestjs/common';
import { InstitutionsService } from './institutions.service.js';

@Module({ providers: [InstitutionsService], exports: [InstitutionsService] })
export class InstitutionsDirectoryModule {}
