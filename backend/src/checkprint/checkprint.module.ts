import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { CheckprintController } from './checkprint.controller.js';
import { CheckprintService } from './checkprint.service.js';

@Module({ imports: [DatabaseModule], controllers: [CheckprintController], providers: [CheckprintService] })
export class CheckprintModule {}
