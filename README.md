# SolidStart Websocket Demo

**Updated** to use [crossws](https://github.com/unjs/crossws) 0.3.1 and [SolidStart](https://github.com/solidjs/solid-start) 1.0.8.

> [!WARNING]
> This demonstration works in `dev` mode, with the development server. Unfortunately right now the `build` version has the client's `WebSocket` failing with a “WebSocket connection to 'ws://localhost:3000/api/_ws/' failed: Invalid frame header” error. (It seems Nitro is only used in the `build` but not under `dev`.)
>
> The workaround is to run the websocket connection on a separate server

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
$ pnpm install

Packages: +493
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 560, reused 493, downloaded 0, added 493, done

dependencies:
+ @solidjs/meta 0.29.3
+ @solidjs/start 1.0.0-rc.0
+ crossws 0.2.4
+ solid-js 1.8.16
+ vinxi 0.3.11

devDependencies:
+ @types/node 20.12.4

Done in 5.9s

$ pnpm run dev

> solid-start-ws-demo@ dev /solid-start-ws-demo
> vinxi dev

vinxi v0.3.11
vinxi starting dev server

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose
```
