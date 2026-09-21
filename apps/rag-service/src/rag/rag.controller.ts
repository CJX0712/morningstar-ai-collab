import { Body, Controller, Get, Post } from '@nestjs/common';
import type {
  Envelope,
  IngestRequest,
  IngestResult,
  RetrieveRequest,
  RetrieveResult,
} from '@morningstar/contracts';
import { RagService } from './rag.service';

@Controller('api/v1')
export class RagController {
  constructor(private readonly service: RagService) {}

  @Post('ingest')
  async ingest(@Body() body: IngestRequest): Promise<Envelope<IngestResult>> {
    return this.service.ingest(body ?? ({} as IngestRequest));
  }

  @Post('retrieve')
  async retrieve(@Body() body: RetrieveRequest): Promise<Envelope<RetrieveResult>> {
    return this.service.retrieve(body ?? ({} as RetrieveRequest));
  }

  @Get('collections')
  async collections(): Promise<Envelope<string[]>> {
    return this.service.collections();
  }
}
