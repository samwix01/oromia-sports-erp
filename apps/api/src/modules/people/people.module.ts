import { Module } from '@nestjs/common';
import { InstitutionsDirectoryModule } from '../institutions/public-api.js';
import { TerritoriesModule } from '../territories/public-api.js';
import { WorkflowModule } from '../workflow/public-api.js';
import { PeopleController } from './people.controller.js';
import { PeopleService } from './people.service.js';

@Module({ imports: [InstitutionsDirectoryModule, TerritoriesModule, WorkflowModule], controllers: [PeopleController], providers: [PeopleService] })
export class PeopleModule {}
