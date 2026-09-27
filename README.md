# Kaiju / City Command — Prototype 02

A browser-based two-player game: a VR or desktop kaiju versus a phone city commander. Play on the same 48-building city with physical VR punches, throwable cars, destructible buildings, tank orders, turrets, and abilities.

## Run

Install Node.js 20 or newer, then from this folder:

~~~sh
npm install
npm start
~~~

Open http://localhost:3000 in two tabs. Enter the same room code, choose opposite roles, and press **Start match**. For solo testing choose Kaiju and **Solo practice**.

For a phone on the same Wi-Fi, open http://COMPUTER_LAN_IP:3000. Windows command `ipconfig` shows the computer's IPv4 address. Allow Node through your private-network firewall if prompted. Localhost on a phone points to the phone, not the computer.

For a headset-accessible internet URL, see [DEPLOY.md](DEPLOY.md). Deploy this repository as a single Node web service behind HTTPS; a static host alone cannot run the multiplayer server. The Dockerfile includes the artwork in `assets/`.

## Kaiju controls

| Action | Desktop | Standard WebXR controllers |
|---|---|---|
| Move | WASD | Left thumbstick |
| Look / turn | Drag scene | Head tracking / right thumbstick |
| Physical punch | Click for the existing forward smash | Swing a hand through a building or unit |
| Forward smash | Click / Smash button | Trigger |
| Grab a car | R / Grab car button | Hold grip |
| Throw held car | R / Throw car button | Swing, then release grip |
| Stomp | Q | B or Y |
| Breath | E | A or X |

VR hand movement is amplified to kaiju scale. The rendered hands and server collision points use the same mapping. Physical punches require contact and sufficient movement speed; each hand has a 0.45-second recovery. Damage scales from 25 to 55. First/stale pose samples and extreme tracking jumps do not deal damage. Trigger smash remains a fallback.

There are 20 parked cars. Grabbing magnetically picks the nearest available car within 10 meters of the kaiju, one per hand. VR throws use recent hand velocity; a gentle release uses a forward lob. Desktop throws use the same forward lob. Cars follow server-simulated ballistic trajectories, collide with buildings/units using swept collision, and deal 70 damage within a five-meter impact radius. Wrecks cannot be reused; a new round restores all cars.

Exit VR or disconnect the kaiju to drop held cars. Controller layouts vary: trigger smash and desktop controls remain available if your controller lacks A/B/X/Y buttons.

## Defender controls

Choose an ability, then tap the map to deploy or target it.

| Order | Cost | Behavior |
|---|---:|---|
| Tank | 35 | Mobile unit; automatically pursues and shoots the kaiju |
| Turret | 50 | Stationary unit with longer firing range |
| Repair | 30 | Restores 45 HP to a damaged standing building; cannot rebuild rubble |
| Missile | 60 | 130 damage in a nine-meter target radius; 10-second cooldown |
| Freeze | 40 | Slows the kaiju for five seconds within a ten-meter target radius; 14-second cooldown |

Credits regenerate at 7/sec, capped at 200. Maximum 20 living units. Missed abilities still spend credits.

To move a tank:
1. Press **Select / Move**, then tap the tank; or choose its button in the deployed-unit roster.
2. Tap a destination on the map. A dashed route and marker show the order.
3. The tank fires while moving and holds position on arrival.
4. **Hold** stops it immediately; **Auto** restores automatic pursuit.

Selecting a turret displays its range, but turrets cannot move. Selection and movement cost no credits. Tank movement is direct; building pathfinding/collision remains outside this prototype's scope.

## Match rules

Kaiju starts at 1,000 HP and wins after destroying 29 of 48 buildings (at least 60%). Defender wins by eliminating the kaiju or surviving 180 seconds. Destruction wins a simultaneous end-state tie.

Either player can select New round after the result. A missing required player pauses both simulation and commands. Reload and reclaim the same role/room to resume. Heartbeats detect dead connections within roughly 20 seconds. Empty rooms expire after ten minutes. A server restart clears rooms.

Practice AI automatically deploys tanks; it is intentionally simple. A practice round keeps its AI if a human defender joins mid-round; start a new round for normal two-player play.

## VR connection requirements

Use a compatible WebXR headset/browser with a secure context. A PC-connected headset can use a compatible browser at http://localhost:3000. A standalone headset accessing a LAN IP generally needs trusted HTTPS.

For self-hosted HTTPS, supply a certificate covering your host/IP and trusted by the headset:

~~~powershell
$env:TLS_KEY = 'C:\certs\city-key.pem'
$env:TLS_CERT = 'C:\certs\city-cert.pem'
npm start
~~~

Open https://YOUR_CERTIFICATE_HOSTNAME:3000 on both devices. Certificate creation/trust provisioning is not bundled. Alternatively deploy behind a hosting platform's HTTPS proxy with WebSocket support; leave TLS_KEY and TLS_CERT unset when the platform terminates TLS.

Start the match before entering VR or ask the defender to start. The headset HUD displays health, city destruction, timer, cooldowns, car availability, and results. Exit VR for lobby/rematch controls.

**Physical headset/controller testing is still required.** Automated tests exercise synthetic hand poses and server rules, not tracking quality, haptic behavior, or comfort. This version uses smooth locomotion without a comfort vignette; camera shake is desktop-only.

## Artwork and feedback

Five local PNG assets provide the kaiju hand, top-down monster, turret, rooftop and facade art. They were generated with OpenAI ImageGen for this project; see [assets/README.md](assets/README.md). Left/right hands share mirrored artwork. The renderer limits GPU textures to 512 pixels and retains small procedural fallbacks if image loading fails.

Buildings show cracks at damage stages, hit flashes, collapse animation, and rubble. Impacts produce capped debris particles and short synthesized sounds. Physical VR hits request controller vibration when supported. Use **Sound on/off** to toggle audio. Audio starts after a user gesture.

## Architecture

- `server.mjs`: local assets and WebSocket rooms, fixed 20 Hz authoritative simulation; one player per role.
- `game.mjs`: movement, abilities, physical punch validation, cars, unit orders, resource rules and win conditions.
- `client.js`: Three.js kaiju renderer, WebXR controls, Canvas tactical map, UI, particles and sound.
- `sprites.js`: artwork loading, fallback sprites and procedural damage overlays.
- `game.test.mjs` / `network.test.mjs`: deterministic mechanics and real two-client WebSocket integration tests.

Clients send movement and hand poses at approximately 20 Hz plus discrete commands. The server derives hand velocity from server-time samples, checks reach and cooldown, and sweeps punches and projectiles through collision boxes. Clients cannot specify damage or authoritative throw speed. As with any client-reported tracking, this is bounded validation, not a full anti-cheat system.

Snapshots broadcast complete state at 20 Hz. Visual collapse is eased; movement has no client prediction or lag compensation. Debris is cosmetic and capped at 240 particles. No database, accounts, or third-party runtime asset requests are needed.

## Verify

~~~sh
npm test
~~~

The suite covers original match rules plus hand reach/speed/cooldown, stale samples, car ownership/trajectory/impact, tank move/hold/auto, role isolation, PNG serving, and disconnect/reconnect over real sockets.

For hardware acceptance: test both hands, punch building edges, grab/release with each grip, throw in different directions, leave/reenter VR, reconnect while holding a car, and finish/rematch with a real phone. See [TEST-RESULTS.md](TEST-RESULTS.md) for completed checks.

## 3D hands and fire breath
Hands now use articulated green mesh geometry with raised scales and claws. Grip (or desktop R) closes the fingers around a held car; releasing opens them. Breath (A/X or E) emits a capped, additive fire particle stream and warm local light using the server-confirmed attack origin and direction. Damage and cooldowns are unchanged. The hands follow controller rotation in VR; headset comfort, orientation, and frame rate still require hardware testing.

