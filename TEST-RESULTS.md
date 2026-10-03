# Prototype 02 verification — 2026-09-27

- Ten simulation tests pass: original movement/combat/win rules plus physical punch validation, tracking jumps, stale samples, car grab/throw/impact, tank move/hold/auto orders, and role restrictions.
- Real WebSocket integration test passes: two roles join and start, duplicate role is rejected, cars damage the city, tank orders replicate, unauthorized commands are rejected, disconnect pauses simulation/commands, and reconnect resumes.
- All five PNG assets are served with image/png and valid PNG signatures.
- Browser playtest: both roles joined, car pickup and throw were reflected in both views, a tank was deployed and selected through the roster, a destination order was issued and the tank reached HOLDING POSITION, and a turret was deployed.
- Desktop and 390 × 844 mobile layouts visually inspected with the generated artwork. Browser logs showed no JavaScript errors or asset fallback warnings during the successful playtest.
- Actual headset tracking, controller vibration, physical throwing feel, and real-phone network conditions remain hardware-unverified. The Dockerfile includes assets but has not been built in this environment.

3D hands/fire update: all 13 Node tests pass, including mirrored volumetric hands, grab curl/reopen, and authoritative breath effect origin/direction. Client/module syntax checks pass. Browser visual verification was inconclusive because preview interaction did not reliably enter the kaiju view; no headset validation performed.


Strategic combat update: no automated tests or browser/headset playtests run, per user preference. Earlier passing results apply to the preceding build only. New facility balance, stamina/block controls, repair crews and feedback need playtesting.

VR embodiment update: no automated tests, browser checks, or headset tests run, as requested. Changes reviewed as source only; earlier test results do not validate this build.

City Command interface update: not test-run. Main page, Create/Join checks, sharing/QR, responsive panels, gestures and deployment confirmation are awaiting user testing.

Campaign/solo update: not tested, at user request. Source reviewed only. Five mission profiles, role-specific local progress, AI on either side, disconnect pause and centered order dialogs require user playtesting. Prior passing results do not validate this build.


Commander cards update (2026-10-02): source edits only; no tests run, per user request. Every campaign stage has an eight-card cycling deck and a three-card hand. Playing or discarding returns that card to the back and queues a replacement; one empty slot refills every five seconds. Credits and ability cooldowns still apply. Click a card (or keys 1–3), then tap the map to play immediately; unit orders are free and instant. Discard selected prevents a hand of unusable repairs. Chapter 1 adds field repair; later decks introduce crews, turrets, freeze, missiles and finally Bastion-01. The final/quick deck is tank, turret, freeze, crew, missile, tank, repair, robot. Bastion is an original steel-and-amber heavy robot: 150 credits, deploy after 45 seconds, once per match, 450 HP, 32 damage every 1.6 seconds at 11m, speed 2.5m/s. It pursues automatically and accepts Move/Hold/Auto. Both AI and human commanders obey card rules. Deck balance is provisional and needs playtesting. Robot has procedural 3D geometry in VR and a matching map icon; no external assets needed.
