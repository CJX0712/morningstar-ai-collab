import { Module } from '@nestjs/common';
import type { Embedder, VectorStore } from '@morningstar/contracts';
import { HealthController } from './health/health.controller';
import { RagController } from './rag/rag.controller';
import { RagService } from './rag/rag.service';
import { EMBEDDER, VECTOR_STORE, createEmbedder, createVectorStore } from './ports/vector.store';

@Module({
  controllers: [HealthController, RagController],
  providers: [
    RagService,
    { provide: VECTOR_STORE, useFactory: (): VectorStore => createVectorStore() },
    { provide: EMBEDDER, useFactory: (): Embedder => createEmbedder() },
  ],
})
export class AppModule {}
