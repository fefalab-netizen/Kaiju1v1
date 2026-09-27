# Kaiju / City Command

A two-player browser prototype: a first-person kaiju versus a touch-screen city commander. Includes desktop and WebXR kaiju controls, a 48-building city, server-owned combat, two unit types, three defender abilities, room codes, practice AI, disconnect pauses, and rematches. All visuals are procedural placeholder geometry; no external asset downloads or CDN requests at runtime.

For a headset-accessible internet URL, see [DEPLOY.md](DEPLOY.md). The source repository alone does not run the multiplayer server; deploy a single Node service behind HTTPS using the included Dockerfile or the documented commands.

## Run locally

Install Node.js 20 or newer. Open a terminal in this folder:

```sh
npm install
npm start
```

Open http://localhost:3000 in two tabs. Enter the same room code (default TOKYO), choose **Kaiju** in one and **Defender** in the other, then press **Start match**. For a one-person test choose Kaiju and **Solo practice**. The practice defender automatically deploys tanks; it is intentionally basic.

For a phone, use the same Wi-Fi network as the server computer, then open `http://COMPUTER_LAN_IP:3000`. On Windows, `ipconfig` shows the computer's IPv4 address. Allow Node through the firewall for your private network if prompted. Use the same room code. The server binds to all network interfaces. No cloud service or account is required. Do not use localhost on the phone: that points to the phone itself.

## Controls and loop

Kaiju: WASD moves relative to facing; drag the scene to look; click or the Smash button attacks forward. Q stomps in a radius; E breathes in a forward cone. Buttons show cooldowns. Walk into the city and aim toward buildings. Buildings change color as they take damage, then collapse into rubble. Units can also be crushed.

Defender: select an order, then tap its target on the tactical map. Orange arrow is the kaiju; blue dots are units. Tanks cost 35 and approach the kaiju to fire. Turrets cost 50 and fire from a fixed position. Repair costs 30 and restores 45 HP to a nearby damaged, standing building. Missile costs 60 and deals 130 damage within its target radius (10-second cooldown). Freeze costs 40 and slows the kaiju for five seconds when the target is within range (14-second cooldown). Missed abilities still spend credits. Credits regenerate at 7/sec, capped at 200. Maximum 20 live units.

Kaiju starts at 1,000 HP and wins after destroying at least 29 of 48 buildings (60% rounded up). Defender wins by eliminating the kaiju or surviving 180 seconds. Destruction wins a simultaneous end-state tie. After the result, either player can select New round; both return to the lobby. Disconnecting a required player pauses the match; reload and reclaim the same role and room to resume. Dead connections are detected through heartbeats (up to roughly 20 seconds). Empty rooms expire after 10 minutes. Server restarts clear all rooms.

## VR setup

WebXR requires a compatible headset/browser and a secure context. A phone defender can use HTTP, but a standalone headset accessing a LAN IP generally needs **trusted HTTPS**. Do not expect Enter VR to work over plain LAN HTTP.

Option A: a PC-connected headset using a compatible WebXR desktop browser at `http://localhost:3000` (localhost is treated as trustworthy).

Option B: supply a TLS certificate and private key trusted by the headset, covering the server's LAN hostname or IP. Set these environment variables before starting (PowerShell example):

```powershell
$env:TLS_KEY = 'C:\certs\city-key.pem'
$env:TLS_CERT = 'C:\certs\city-cert.pem'
npm start
```

Then use `https://YOUR_CERTIFICATE_HOSTNAME:3000` on both devices. Certificate creation/trust provisioning depends on the headset and local environment and is not bundled. Alternatively use a trusted HTTPS reverse proxy that forwards WebSocket upgrades to port 3000.

Choose Kaiju, start the match from the page (or ask the defender to start), then select Enter VR. Left thumbstick moves, right thumbstick rotates, either trigger smashes, either grip stomps, and A/X fires breath on standard XR controllers. Motion-tracked orange hands are placeholders; attacks use avatar facing and button presses, not physical punch velocity. A headset HUD shows health, destruction, time, cooldowns, and results. Exit VR to use lobby/rematch buttons. Smooth locomotion has no comfort vignette in this prototype.

VR uses Three.js [WebXRManager](https://threejs.org/docs/pages/WebXRManager.html) and [VRButton](https://threejs.org/docs/pages/VRButton.html). Actual headset/controller behavior has not been hardware-tested.

## Architecture

`server.mjs` serves local assets and hosts WebSocket rooms on the same HTTP(S) port. A role is exclusive per room. Clients send join/start/reset and intent messages; kaiju movement is sent at about 20 Hz, while attacks and defender orders are discrete. The server runs a fixed 20 Hz simulation, validates roles, finite coordinates, costs and cooldowns, normalizes movement, clamps world positions, and expires stale movement after 0.5 seconds. It broadcasts complete state snapshots at 20 Hz. Clients render the latest authoritative state; building collapse is visually eased. There is no prediction or latency compensation.

`game.mjs` is the simulation, independent of networking. `client.js` renders Three.js for the kaiju and a Canvas 2D map for the defender. `game.test.mjs` tests core rules. `style.css` and `index.html` provide the responsive lobby and HUD. Dependencies are pinned in package.json; pnpm-lock.yaml records the development install.

Prototype limits: one city layout, no building collision/pathfinding, no positional audio, no persistence, no authentication or role-reconnect secrets, no dedicated server deployment configuration. Room codes isolate test sessions but are not private credentials. A practice room keeps its AI if a human defender later joins; use New round after a match for a normal two-player game. Balance is initial tuning, not competitive validation.

## Verification

```sh
npm test
```

Tests cover normalized/stale movement, cooldowns and destruction, unit damage, spending and repair restrictions, each win condition, and invalid/unauthorized commands. Manual acceptance: connect desktop + phone, deploy units, destroy buildings, use each ability, disconnect/rejoin, finish a round, and rematch. Repeat on real VR hardware before treating headset support as verified.
