# SolidStart Websocket Demo

**Updated** to use [SolidStart](https://github.com/solidjs/solid-start) 1.0.9.

Ported the UnJS [crossws](https://crossws.unjs.io/guide#quick-start) [h3 example](https://github.com/unjs/crossws/tree/05ded7bd961d26d310786f529c0deb8cf9dcf02c/examples/h3) ([StackBlitz](https://stackblitz.com/github/unjs/crossws/tree/main/examples/h3)) to [SolidStart v1](https://github.com/solidjs/solid-start/releases/tag/v1.0.0).

Concurrently with the 1.0.9 release the SolidStart documentation was updated with instructions on how to leverage Nitro's **experimental** support (crossws based) for WebSockets:
- SolidStart: [WebSocket Endpoint](https://docs.solidjs.com/solid-start/advanced/websocket)
- Nitro: [WebSocket—Opt-in to the experimental feature](https://nitro.unjs.io/guide/websocket#opt-in-to-the-experimental-feature)
- crossws: [Pub / Sub](https://crossws.unjs.io/guide/pubsub)

---

```shell
$ cd solid-start-ws-demo
$ pnpm install
Packages: +469
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Progress: resolved 469, reused 469, downloaded 0, added 469, done

dependencies:
+ @solidjs/meta 0.29.4
+ @solidjs/start 1.0.9
+ solid-js 1.9.2
+ vinxi 0.4.3

devDependencies:
+ prettier 3.3.3

Done in 1.3s
$ pnpm run dev

> solid-start-ws-demo@ dev solid-start-ws-demo
> vinxi dev

vinxi v0.4.3
vinxi starting dev server

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose

enabling websockets
```

---

# Notes

The server side core functionality is found in [`src/server/ws.ts`](src/server/ws.ts):

```ts
export default eventHandler({
  handler() {},
  websocket: {
    async open(peer) {
      console.log('[ws] open', peer);
      
      const user = userFromId(peer.id);
      peer.send(toPayload(SERVER_ID, `Welcome ${user}`));

      // Join new client to the "chat" channel
      peer.subscribe(CHANNEL_NAME);
      // Notify every other connected client
      peer.publish(CHANNEL_NAME, toPayload(SERVER_ID,`${user} joined!`));
    },

    async message(peer, message) {
       const user = userFromId(peer.id);
      console.log('[ws] message', user, message);

      const content = message.text();
      if (content.includes('ping')) {
        peer.send('pong');
        return;
      }

      const payload = toPayload(peer.id, content);
      // The server re-broadcasts incoming messages to everyone … 
      peer.publish(CHANNEL_NAME, payload);
      // … but the source 
      peer.send(payload);
    },

    async close(peer, details) {
      const user = userFromId(peer.id);
      console.log('[ws] close', user, details);

      peer.unsubscribe(CHANNEL_NAME);
      peer.publish(CHANNEL_NAME, toPayload(SERVER_ID,`${user} has left the chat!`));
    },

    async error(peer, error) {
      console.log('[ws] error', userFromId(peer.id), error);
    },
  },
});
```

Nitro/crossws abstracts the WebSocket interface to the `open`, `message`, `close` and `error` "hooks" (event callbacks). The `Peer<T>` type represents the particular client the event is associated with.

The [`Peer`](https://crossws.unjs.io/guide/peer) structure exposes [pub/sub](https://crossws.unjs.io/guide/pubsub) methods which make it possible *for the server* to broadcast (`peer.publish(channel, message)`) a `message` to the subscribers of a `channel` on behalf of that `peer` (i.e. the `peer` won't receive that `message`). 

Note that the payload is explicitly `send` as a `string`.

```ts
// Don't want to send binary Blob to the client
const toPayload = (from: String, message: string) =>
  JSON.stringify({ user: from, message: message });
```

Non-string values are sent as binary [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)s which have to be [deserialized](https://developer.mozilla.org/en-US/docs/Web/API/Blob#extracting_data_from_a_blob) on the receiving side as well.

It needs to be noted that the pub/sub functionality is self-contained to the endpoint's WebSocket peers so that the server can coordinate communication among those peers. If it is necessary for the server to *initiate* communication with the endpoint's peers it may be necessary to mitigate the [server/routes lobotomy](https://github.com/peerreynders/server_-routes-lobotomy), e.g. have each peer subscribe to a [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) to which the server [`postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel/postMessage)s any relevant data.

The server configuration needs to load the endpoint's WebSocket hooks in [`app.config.ts`](app.config.ts):

```ts
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
    experimental: {
      websocket: true,
    },
  },
}).addRouter({
  name: "_ws",
  type: "http",
  handler: "./src/server/ws.ts",
  target: "server",
  base: "/_ws",
});
```

On the client side ([`src/app.tsx`](src/app.tsx)) the WebSocket is handled on the vanilla level. Related data is aggregated in a context structure:

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
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/_ws/`;
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
