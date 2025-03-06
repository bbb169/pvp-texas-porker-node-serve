import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';

function normalizePort(val: string): number | string | boolean {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.setGlobalPrefix('api');
    
    app.use(morgan('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(cors());
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({
      limit: '10000kb',
      extended: true,
      parameterLimit: 50000,
    }));

    app.useStaticAssets(path.join(__dirname, '..', 'public'));
    
    app.setBaseViewsDir(path.join(__dirname, '..', 'views'));
    app.setViewEngine('jade');
    
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
    }));
    
    app.useGlobalFilters(new GlobalExceptionFilter());
    
    const port = normalizePort(process.env.PORT || '3000');
    const server = createServer(app.getHttpAdapter().getInstance());
    
    await app.init();
    server.listen(port);
    
    server.on('error', error => onError(error, port));
    server.on('listening', () => {
      const addr = server.address();
      const bind = typeof addr === 'string' ? `pipe ${addr}` : addr ? `port ${addr.port}` : 'unknown port';
      console.log(`Listening on ${bind}`);
    });

    console.log(`Application is running on port: ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

function createServer(server: any): http.Server | https.Server {
  if (process.env.NODE_ENV === 'production' && 
      fs.existsSync('./certificates/privkey.pem') &&
      fs.existsSync('./certificates/cert.pem')) {
    const privateKey = fs.readFileSync('./certificates/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('./certificates/cert.pem', 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    return https.createServer(credentials, server);
  }

  return http.createServer(server);
}

function onError(error: NodeJS.ErrnoException, port: number | string | boolean): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? `Pipe ${port}`
    : `Port ${port}`;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});