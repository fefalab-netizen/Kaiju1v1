# Play from a VR headset over the internet

The GitHub repository contains the source. To get a playable URL, deploy this project as a **Node web service** or use the included Dockerfile on a host that provides HTTPS and supports WebSocket upgrades. Static-only hosting cannot run this multiplayer server.

## Service settings

- Build command: `npm install --omit=dev`
- Start command: `npm start`
- Container alternative: build the repository's `Dockerfile`.
- Port: the server reads the host's `PORT` environment variable, default 3000.
- Health-check path: `/`
- HTTPS: terminate TLS at the hosting platform's proxy; forward HTTP and WebSockets to the same service. Leave TLS_KEY and TLS_CERT unset when the proxy handles TLS.
- Instances: **one**. Rooms live in process memory. Multiple instances require shared room routing/state, which is not implemented.
- Sleep/restarts: interrupt active matches and erase rooms; use a continuously running instance for reliable play.

Open the resulting `https://...` URL in your headset browser. Choose Kaiju. Open the same URL on your phone, enter the same room, and choose Defender. Start the match, then select Enter VR in the headset. The client automatically uses secure WebSockets on HTTPS pages.

Do not publish certificate/private-key files. Room codes are not passwords; this is a prototype for small playtests, with no account authentication. Hosting fees and account setup depend on the chosen provider.

## Local container test

```sh
docker build -t kaiju-city .
docker run --rm -p 3000:3000 kaiju-city
```

Visit http://localhost:3000 on the computer. This local container command does not itself provide trusted HTTPS for a standalone headset.

The Dockerfile is provided for deployment but has not been built in this environment.
