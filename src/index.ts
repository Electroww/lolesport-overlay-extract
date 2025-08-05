import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { ocrRoutes } from './routes/ocrRoutes';
import { ocrService } from './services/ocrService';

const fastify = Fastify({
  logger: true
});

async function start() {
  try {
    await fastify.register(multipart, {
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
      }
    });
    await fastify.register(cors, {
      origin: true
    });

    await fastify.register(ocrRoutes);

    fastify.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: Date.now() };
    });

    await ocrService.initialize();
    console.log('OCR Service initialized');

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);

  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await ocrService.terminate();
  await fastify.close();
});

start();