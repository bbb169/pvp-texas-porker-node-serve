import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { RoomSocketService } from './services/room-socket.service';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export async function bootstrap (): Promise<void> {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');
    
    // Configure global prefix for all routes
    app.setGlobalPrefix('api');
    
    // Configure middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use(require('cors')());
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({
        limit: '10000kb',
        extended: true,
        parameterLimit: 50000,
    }));
    
    // Configure static assets
    app.useStaticAssets(path.join(__dirname, '..', 'public'));
    
    // Set view engine
    app.setBaseViewsDir(path.join(__dirname, '..', 'views'));
    app.setViewEngine('jade');
    
    // Configure global pipes and filters
    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        validationError: { target: false, value: false },
    }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    
    // Get port from environment and store in Express
    const port = normalizePort(process.env.PORT || '3000');
    app.set('port', port);
    
    // Create HTTP/HTTPS server
    const nestServer = app.getHttpAdapter().getInstance();
    const server = createServer(nestServer);
    
    // Initialize WebSocket
    const roomSocketService = app.get(RoomSocketService);
    roomSocketService.initWebSocket(server);

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => onError(error, server, port));
    server.on('listening', () => onListening(server));

    // Start listening on the specified port
    server.listen(port);
    
    logger.log(`Application is running on: ${await app.getUrl()}`);
    
    // Handle termination signals for graceful shutdown
    process.on('SIGINT', async () => {
        logger.log('Application is shutting down...');
        await app.close();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        logger.log('Application is shutting down...');
        await app.close();
        process.exit(0);
    });
}

function normalizePort (val: string): number | string | boolean {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // Named pipe
        return val;
    }

    if (port >= 0) {
        // Port number
        return port;
    }

    return false;
}

function createServer (instance: any): http.Server {
    if (process.env.NODE_ENV === 'production' && 
        fs.existsSync('./certificates/privkey.pem') && 
        fs.existsSync('./certificates/cert.pem')) {
        const privateKey = fs.readFileSync('./certificates/privkey.pem', 'utf8');
        const certificate = fs.readFileSync('./certificates/cert.pem', 'utf8');
        return https.createServer({ key: privateKey, cert: certificate }, instance);
    }
  
    // Use HTTP for development or if certificates are not available
    return http.createServer(instance);
}

function onError (error: NodeJS.ErrnoException, server: http.Server, port: number | string | boolean): void {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? `pipe ${port}`
        : `port ${port}`;

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

function onListening (server: http.Server): void {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? `pipe ${addr}`
        : `port ${addr?.port}`;
    console.log(`Listening on ${bind}`);
}

// Allow direct execution from command line
if (require.main === module) {
    bootstrap().catch(err => {
        console.error('Failed to start the application:', err);
        process.exit(1);
    });
}