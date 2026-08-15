import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

const cyan = '\x1b[36m';
const reset = '\x1b[0m';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);

  console.log(
    cyan +
      '====================================================================================' +
      reset,
  );
  console.log(cyan + '🚀 NESTJS server started on PORT ' + port + reset);
  console.log(
    cyan +
      '====================================================================================' +
      reset,
  );
}

bootstrap();
