// file: src/server/ws.ts
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

console.log('server/ws', new Date());

export { websocket };
