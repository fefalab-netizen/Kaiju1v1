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


## Strategic combat update
Three existing city blocks are now marked POWER, HOSPITAL and EVAC, in both VR and the defender map. Destroy all three OR 60% of the city to win as kaiju. The defender wins by defeating the kaiju or completing the evacuation countdown.

- Power lost: stationary turrets fire every 2 seconds instead of every second.
- Hospital lost: crew repairs drop from 8 to 4 HP per second; instant repair drops from 45 to 22 HP. Destroyed buildings cannot be restored.
- Evacuation center lost: countdown runs at half speed. Remaining display is evacuation work remaining, not wall-clock time.
- Repair crew costs 40 credits, has 65 HP, automatically travels to damaged buildings and repairs within 6m. Select/Move, Hold and Auto also work for crews. Crews do not shoot. Tanks pursue; turrets remain stationary.
- Kaiju has 100 stamina, regenerating 12/second outside block. Smash costs 8, physical punch contact 6, stomp 30, breath 40.
- Toggle frontal block with desktop B, the Block button, or right VR thumbstick click. Block reduces frontal incoming damage by 75%, drains 18 stamina/second, slows movement, and prevents punches/smash/stomp/breath. Rear attacks bypass it. Guard drops when input goes stale or the player disconnects.
- Combat feedback includes animated tracer rounds, directional damage/block messages in desktop and VR HUDs, hit confirmations, distinct synthesized sound cues, extra collapse debris, and facility-loss alerts. Tracers visualize server-resolved hits; they are not dodgeable simulated projectiles.

This update was not test-run, following the user's preference to playtest personally. Intro video, themed main page, tutorials and rematch flow are reserved for the next stage.

## VR embodiment update
The VR player now has a rudimentary green torso, segmented arms connected to the tracked wrists, legs and clawed feet. Looking down reveals the body. Walking gives the feet a small cosmetic gait and plays low footstep thumps. No camera bob or forced headset shake is added. The body can be hidden with the VR body button before entering VR.

Server-confirmed smash animates an available fist; stomp briefly braces the hands and lifts a foot. Held hands keep their grip. These are cosmetic animations: raw controller poses, reach, damage timing and throw physics are unchanged. Frontal block curls empty fists and displays a blue guard arc. A green center hit marker confirms contact; orange incoming-hit arcs and blue blocked-hit arcs follow the actual headset viewing direction. Direction labels remain in the HUD.

Dedicated low-frequency stomp and smash sounds, quieter movement thumps, and controller haptics add weight. The existing Sound button mutes all sounds. Haptics are used only when supported. VR turns default to 30-degree snap turning; the VR turn button before entering VR switches to smooth turning. Controller hand mirroring follows the device's reported handedness.

No tests were run for this update, at the user's request. Body proportions, wrist connections, animation feel, audio levels, headset performance and comfort await user playtesting.

## City Command interface
The main page uses the promotional poster, two role choices and explicit Create/Join modes. Create generates a six-character room code; join checks that a room exists. After joining, Invite player opens a share link and a locally generated QR code. Use a deployed HTTPS or LAN address for other devices; localhost links work only on the host device. Joining an invite still requires choosing a role. Room occupancy is shown after joining.

The responsive commander interface has facility health cards (tap to center map), a unit roster, Units/Abilities/Orders categories, health/task details, and cost explanations. Deployments and move orders use a map preview and explicit confirmation. Drag to pan; pinch, mouse wheel, or +/− to zoom. Reset view returns to the whole city. Desktop shortcuts: 1 tank, 2 turret, 3 repair crew, 4 repair ability, 5 missile, 6 freeze, V select, Escape cancel. No combat rules were changed.

QR encoding is bundled from https://github.com/kazuhikoarase/qrcode-generator (MIT; QR-LICENSE.txt). No external QR service receives room links. Cinematic poster art is labeled as promotional art. Intro video integration is pending the user's video file; no autoplay placeholder or video download is included.

No tests, browser checks or headset checks were run for this interface update, as requested.

## Campaign and solo play
Choose Quick Match (existing two-player rules), Solo Quick Match (either role versus AI), or Campaign on the main page, then choose your side. Solo still uses the game server but needs no second browser, player or headset. Solo defenders use the 2D map only: no WebGL renderer, VR session or kaiju body is created. The kaiju AI runs in the server simulation, pursues buildings and telegraphs attacks before resolving them.

Campaign is a five-mission progression on the existing city, with briefings, unlocks, victory gates, retries and a finale. Each mission resets the battlefield. Win to enable Next chapter. Chapter unlocks are stored separately for kaiju and commander in localStorage on this browser; they do not sync across devices, are not account-backed, and do not save an in-progress battle. A running solo session pauses when its human disconnects and can be rejoined through its room URL until the server discards the inactive room. Server restarts reset active sessions.

| Chapter | Kaiju HP / damage | Unit HP / damage | Starting credits / income | Kaiju objective | Unlocks |
|---|---|---|---|---|---|
| First Contact | 350 / 35% | 45% | 35 / 2 per second | 6 blocks | Smash, basic tanks |
| Growing Threat | 500 / 50% | 60% | 50 / 3.5 per second | 12 blocks | Stomp, crews, repairs |
| Hold the Line | 700 / 70% | 75% | 65 / 5 per second | 20 blocks | Turrets |
| Firestorm | 850 / 85% | 90% | 80 / 6 per second | 24 blocks | Breath, freeze |
| City at War | 1000 / 100% | 100% | 100 / 7 per second | 29 blocks or all facilities | Missiles, full Quick Match rules |

Defenders win each chapter by defeating the monster or completing evacuation. Early chapters last 120, 140 and 160 seconds of evacuation work; chapters 4–5 use 180. Losing EVAC still halves countdown speed. Other facility penalties remain throughout, but destroying all three is an alternate win only in the finale and Quick Match. Car throws and physical punches also use the chapter's damage multiplier.

VR: press a trigger from the lobby to begin, or from results to advance after a campaign victory (replay otherwise). This avoids taking off the headset between chapters.

Defender orders now open a centered, keyboard-accessible confirmation dialog. Confirm commits the marked position; Cancel or Escape dismisses it. The match keeps running; the dialog closes if play ends or pauses.

No automated tests, browser tests or headset tests were run for this update, per user preference. Campaign balance and AI behavior require playtesting.
