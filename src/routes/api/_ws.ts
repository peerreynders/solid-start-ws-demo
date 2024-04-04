// file: src/routes/api/_ws.ts
import { handleUpgrade, isWsConnect } from '../../entry-server';
import type { APIEvent } from "@solidjs/start/server";

export function GET(event: APIEvent) {
	const request = event.nativeEvent.node.req;
	if (!isWsConnect(request))
		return new Response(undefined,{ status: 400, statusText: 'Bad Request' });

	handleUpgrade(request);

  return undefined
}

