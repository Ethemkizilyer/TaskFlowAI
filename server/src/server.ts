import http from 'http';
import { config } from './config';
import app from './app';
import { initSocketServer } from './sockets/socketHandler';
import { initGameNamespaces } from './sockets/gameSocketHandler';

const server = http.createServer(app);

const io = initSocketServer(server);
initGameNamespaces(io);

server.listen(config.port, () => {
  console.log(`\n========================================`);
  console.log(`  TaskFlow AI Server`);
  console.log(`  Running on port ${config.port}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Socket.io: Active`);
  console.log(`  AI Service: ${config.geminiApiKey ? 'Configured' : 'Not configured'}`);
  console.log(`========================================\n`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { io };
