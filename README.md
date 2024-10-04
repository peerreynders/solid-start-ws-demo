# SolidStart Websocket Demo

**Updated** to use [crossws](https://github.com/unjs/crossws) 0.3.1 and [SolidStart](https://github.com/solidjs/solid-start) 1.0.8.

> [!WARNING]
> This demonstration works in `dev` mode, with the development server. Unfortunately right now the `build` version has the client's `WebSocket` failing with a “WebSocket connection to 'ws://localhost:3000/api/_ws/' failed: Invalid frame header” error. (It seems Nitro is only used in the `build` but not under `dev`.)
>
> The workaround is to run the websocket connection on a separate server
> 
> To demonstrate the `build` workaround modifiy [`src/app.tsx`](src/app.tsx) to:
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
