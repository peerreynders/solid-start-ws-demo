# SolidStart Websocket Demo

**Updated** to use [crossws](https://github.com/unjs/crossws) 0.3.1 and [SolidStart](https://github.com/solidjs/solid-start) 1.0.8.

> [!WARNING]
> This demonstration works in `dev` mode, with the development server. Unfortunately right now the `build` version has the client's `WebSocket` failing with a “WebSocket connection to 'ws://localhost:3000/api/_ws/' failed: Invalid frame header” error. (It seems Nitro is only used in the `build` but not under `dev`.)
>
> The workaround is to run the websocket connection on a separate server
> 
> To demonstrate the `build` workaround modify [`src/app.tsx`](src/app.tsx) to:
> ```tsx
> const hrefToWs = (location: Location) =>
> //  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/_ws/`;
>   `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:3001/_ws/`; 
> ```
>
> then
>
> ```shell
> /solid-start-ws-demo$ pnpm build
> …
> 
> /solid-start-ws-demo$ pnpm wa:bundle
>
> solid-start-ws-demo@ wa:bundle /solid-start-ws-demo
> node_modules/.pnpm/esbuild@0.20.2/node_modules/esbuild/bin/esbuild workaround.ts --bundle --platform=node --format=esm --outfile=wa.mjs
>
>
>  wa.mjs  118.7kb
>
> ⚡ Done in 13ms
>
> /solid-start-ws-demo$ pnpm wa:preview
>
> solid-start-ws-demo@ wa:preview /solid-start-ws-demo
> node wa.mjs & node .output/server/index.mjs
>
> server/ws 2024-10-04T02:44:43.325Z
> Listening on http://[::]:3000
> ```

Ported the UnJS [crossws](https://crossws.unjs.io/guide#quick-start) [h3 example](https://github.com/unjs/crossws/tree/05ded7bd961d26d310786f529c0deb8cf9dcf02c/examples/h3) ([StackBlitz](https://stackblitz.com/github/unjs/crossws/tree/main/examples/h3)) to [SolidStart v1](https://github.com/solidjs/solid-start/releases/tag/v1.0.0).

To be clear; SolidStart at this point does not seem to directly leverage the [h3-based WebSocket capability](https://h3.unjs.io/guide/websocket) emerging for [Nitro](https://nitro.unjs.io/guide/websocket#opt-in-to-the-experimental-feature) and [Nuxt](https://github.com/pi0/nuxt-chat/blob/main/nuxt.config.ts).
The functionality is **experimental** even for those products.

While vinxi has already assimilated this *experimental* capability, examples seem rely on the [vinxi route configuration](https://github.com/nksaraf/vinxi/blob/4bddafe1b7e873ef691392ebaf7ea4f4875e39d4/examples/react/ssr/basic/app.config.js#L25-L31) binding the server side websocket [`eventHandler`](https://github.com/nksaraf/vinxi/blob/4bddafe1b7e873ef691392ebaf7ea4f4875e39d4/examples/react/ssr/basic/app/ws.ts#L3) directly to the vinxi application.

SolidStart doesn't expose vinxi routes but wraps them with its own [routing abstraction](https://github.com/solidjs/solid-start/blob/2d75d5fedfd11f739b03ca34decf23865868ac09/packages/start/config/index.js#L78) which currently doesn't explicitly accomodate websocket routes.
Given that this is an evolving UnJS standard, it makes sense to wait for the capability to stabilize in Nitro and vinxi before adapting it into SolidStart's architecture.

It turns out that it is possible to subvert [API Routes](https://docs.solidjs.com/solid-start/building-your-application/api-routes) into upgrading to websocket connections.

[`src/routes/api/_ws.ts`](src/routes/api/_ws.ts) demonstrates the approach of connecting clients to the websocket server in [`src/server/ws.ts`](src/server/ws.ts).

---

```shell
$ cd solid-start-ws-demo
solid-start-ws-demo$ pnpm install
Lockfile is up to date, resolution step is skipped
Packages: +467
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 467, reused 467, downloaded 0, added 467, done
node_modules/.pnpm/esbuild@0.20.2/node_modules/esbuild: Running postinstall script, done in 52ms

dependencies:
+ @solidjs/meta 0.29.4
+ @solidjs/start 1.0.8
+ crossws 0.3.1
+ solid-js 1.9.1
+ vinxi 0.4.3

devDependencies:
+ @types/node 22.7.4
+ prettier 3.3.3

Done in 1.1s
solid-start-ws-demo$ pnpm dev

> solid-start-ws-demo@ dev solid-start-ws-demo
> vinxi dev

vinxi v0.4.3
vinxi starting dev server

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose
```

---

# Notes

The server side core functionality is found in [`src/server/ws.ts`](src/server/ws.ts):

```ts
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
```

`crossws` abstracts the websocket interface to `upgrade`, `open`, `message`, `close` and `error` event( callback)s. All but `upgrade` involve a `peer` type which represents the particular client the event is associated with.

The `peer` structure has a `peers` member which enumerates the currently active clients on this socket which were all upgraded on this `ws` structure's `handleUpgrade` function. This is what allows the `message` event hook to send the server bound message to all the clients, including the originator.

Note that the payload is explicitly `send` as a `string`.

```ts
// Don't want to send binary Blob to the client
const toPayload = (from: String, message: string) =>
  JSON.stringify({ user: from, message: message });
```

Non-string values are sent as binary [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)s which have to be [deserialized](https://developer.mozilla.org/en-US/docs/Web/API/Blob#extracting_data_from_a_blob) on the receiving side as well.

The API endpoint [`src/routes/api/_ws.ts`](src/routes/api/_ws.ts) associates that singleton `ws` structure with the server's `/api/_ws` URL:

```ts
export function GET(event: APIEvent) {
  const request = event.nativeEvent.node.req;
  if (!isWsConnect(request))
    return new Response(undefined, { status: 400, statusText: 'Bad Request' });

  handleUpgrade(request);

  return undefined;
}

```

`isWsConnect` simply checks whether the request holds the expected headers for a websocket request. With those requirements satisfied the request is handed over to the `ws` structure for upgrade and subsequent handling. 

On the client side ([`src/app.tsx`](src/app.tsx)) the websocket is handled on the vanilla level. Related data is aggregated in a context structure:

```ts
type WsContext = {
  ws: WebSocket | undefined;
  href: string;
  onMessage: (event: MessageEvent<string>) => void;
  log: (user: string, ...args: Array<string>) => void;
  clear: () => void;
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
};
```

`href` is used to indicate the URL to use to connect to the server's websocket which is set with `hrefToWs()` based on the client's [`location`](https://developer.mozilla.org/en-US/docs/Web/API/Location):

```ts
const hrefToWs = (location: Location) =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/_ws/`;
```

`log()` manages client-bound messages.

```ts
const log = (user: string, ...args: Array<string>) => {
    console.log('[ws]', user, ...args);
    const message = {
      text: args.join(' '),
      user,
      createdAt: new Date().toLocaleString(),
    };
    const index = messages.length;
    setMessages(index, message);
    scroll();
  };
```

`clear()` resets the display.

```ts
  const clear = () => {
    setMessages([]);
    log('system', 'previous messages cleared');
  };
```

`onMessage()` is the event listener for client-bound messages from the [`WebSocket`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event).

```ts
const onMessage = (event: MessageEvent<string>) => {
  const { user, message } = event.data.startsWith('{')
    ? (JSON.parse(event.data) as { user: string; message: unknown })
    : { user: 'system', message: event.data };

  log(user, typeof message === 'string' ? message : JSON.stringify(message));
};
```

The context structure `wsContext` is initialized once the application's [DOM has been mounted on the page](https://docs.solidjs.com/reference/lifecycle/on-mount#onmount).

```ts
wsContext = {
  ws: undefined,
  href: hrefToWs(location),
  onMessage,
  log,
  clear,
  send: (data) => wsContext.ws?.send(data),
};
```

`wsConnect()` is responsible for the `ws` member of the context structure, closing a previously opened socket before creating the websocket and attaching event listeners. Note that the `ws` member isn't set until the [`open` event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/open_event). 

```ts
function wsConnect(ctx: WsContext) {
  if (ctx.ws) {
    ctx.log('ws', 'Closing previous connection before reconnecting…');
    ctx.ws.close();
    ctx.ws = undefined;
    ctx.clear();
  }

  ctx.log('ws', 'Connecting to', ctx.href, '…');
  const ws = new WebSocket(ctx.href);

  ws.addEventListener('message', ctx.onMessage);
  ws.addEventListener('open', () => {
    ctx.ws = ws;
    ctx.log('ws', 'Connected!');
  });
}
```

Solid's primary responsibility is to project past messages into the DOM:

```tsx
<div id="messages" ref={messageList}>
  <For each={messages}>
    {(message) => (
      <div class="c-message">
        <div>
          <p class="c-message__annotation">{message.user}</p>
          <div class="c-message__card">
            <img src={gravatarHref(message.user)} alt="Avatar" />
            <div>
              <p>{message.text}</p>
            </div>
          </div>
          <p class="c-message__annotation">{message.createdAt}</p>
        </div>
      </div>
    )}
  </For>
</div>
```
To that end relevant messages are held in a [store](https://docs.solidjs.com/reference/store-utilities/create-store) whose content is managed by the `log` and `clear` functions accessible via `wsContext`.

```ts
const [messages, setMessages] = createStore<Array<Message>>([]);
```
