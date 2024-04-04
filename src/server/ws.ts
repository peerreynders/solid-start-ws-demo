// file: src/server/ws.ts
import type { IncomingMessage } from 'node:http';
import wsAdapter from 'crossws/adapters/node';

const websocket = wsAdapter({
	hooks: {
		open(peer) {
			console.log('[ws] open', peer);
			peer.send({ user: 'server', message: `Welcome ${peer}` });
		},

		message(peer, message) {
			console.log('[ws] message', peer, message);
			peer.send(
				message.text().includes('ping')
					? 'pong'
					: { user: peer.toString(), message: message.toString() }
			);
		},

		close(peer, event) {
			console.log('[ws] close', peer, event);
		},

		error(peer, error) {
			console.log('[ws] error', peer, error);
		},

		upgrade(req) {
			console.log(`[ws] upgrading ${req.url}...`);
			return {
				headers: {},
			};
		},
	},
});

const emptyBuffer = Buffer.from('');
const handleUpgrade = (request: IncomingMessage) =>
	websocket.handleUpgrade(request, request.socket, emptyBuffer);

const isWsConnect = ({ headers }: IncomingMessage) =>
	headers['connection']?.toLowerCase() === 'upgrade' &&
	headers['upgrade'] === 'websocket' &&
	headers['sec-websocket-version'] === '13' &&
	typeof headers['sec-websocket-key'] === 'string';

export { handleUpgrade, isWsConnect };
