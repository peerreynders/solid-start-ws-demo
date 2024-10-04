// file: workaround.ts
import { createServer } from 'node:http';
import { ws } from './src/server/ws';

const server = createServer().listen(3001);

server.on('upgrade', ws.handleUpgrade);
