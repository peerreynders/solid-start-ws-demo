// @refresh reload
import { createHandler, StartServer } from '@solidjs/start/server';
import { websocket } from './server/ws';
import type { IncomingMessage } from 'node:http';

const emptyBuffer = Buffer.from('');
const handleUpgrade = (request: IncomingMessage) =>
	websocket.handleUpgrade(request, request.socket, emptyBuffer);

const isWsConnect = ({ headers }: IncomingMessage) =>
	headers['connection']?.toLowerCase().includes('upgrade') &&
	headers['upgrade'] === 'websocket' &&
	headers['sec-websocket-version'] === '13' &&
	typeof headers['sec-websocket-key'] === 'string';

export { handleUpgrade, isWsConnect };

export default createHandler(() => (
	<StartServer
		document={({ assets, children, scripts }) => (
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<link rel="icon" href="/favicon.ico" />
					<link href="/styles.css" rel="stylesheet" />
					{assets}
				</head>
				<body>
					<div id="app">{children}</div>
					{scripts}
				</body>
			</html>
		)}
	/>
));

