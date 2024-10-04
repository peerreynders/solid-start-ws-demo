// file: src/server/ws.ts
import crossws from 'crossws/adapters/node';

import type { IncomingMessage } from 'node:http';

const userFromId = (id: string) => id.slice(-6);

// Don't want to send binary Blob to the client
const toPayload = (from: String, message: string) =>
	JSON.stringify({ user: from, message: message });

const ws = crossws({
	hooks: {
		open(peer) {
			console.log('[ws] open', peer);

			peer.send(toPayload('server', `Welcome ${userFromId(peer.id)}`));
		},

		message(peer, message) {
			const user = userFromId(peer.id);
			console.log('[ws] message', user, message);

			const content = message.text();
			if (content.includes('ping')) {
				peer.send('pong');
				return;
			}

			const payload = toPayload(peer.id, content);
			for (const destination of peer.peers) destination.send(payload);
		},

		close(peer, event) {
			console.log('[ws] close', userFromId(peer.id), event);
		},

		error(peer, error) {
			console.log('[ws] error', userFromId(peer.id), error);
		},

		upgrade(req) {
			console.log(`[ws] upgrading ${req.url}...`);
			return {
				headers: {},
			};
		},
	},
});

const handleUpgrade = (request: IncomingMessage) =>
	ws.handleUpgrade(request, request.socket, Buffer.alloc(0));

const isWsConnect = ({ headers }: IncomingMessage) =>
	headers['connection']?.toLowerCase().includes('upgrade') &&
	headers['upgrade'] === 'websocket' &&
	headers['sec-websocket-version'] === '13' &&
	typeof headers['sec-websocket-key'] === 'string';

console.log('server/ws', new Date());

export { handleUpgrade, isWsConnect, ws };
