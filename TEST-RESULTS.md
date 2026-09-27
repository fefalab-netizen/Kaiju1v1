# Prototype 02 verification — 2026-09-27

- Ten simulation tests pass: original movement/combat/win rules plus physical punch validation, tracking jumps, stale samples, car grab/throw/impact, tank move/hold/auto orders, and role restrictions.
- Real WebSocket integration test passes: two roles join and start, duplicate role is rejected, cars damage the city, tank orders replicate, unauthorized commands are rejected, disconnect pauses simulation/commands, and reconnect resumes.
- All five PNG assets are served with image/png and valid PNG signatures.
- Browser playtest: both roles joined, car pickup and throw were reflected in both views, a tank was deployed and selected through the roster, a destination order was issued and the tank reached HOLDING POSITION, and a turret was deployed.
- Desktop and 390 × 844 mobile layouts visually inspected with the generated artwork. Browser logs showed no JavaScript errors or asset fallback warnings during the successful playtest.
- Actual headset tracking, controller vibration, physical throwing feel, and real-phone network conditions remain hardware-unverified. The Dockerfile includes assets but has not been built in this environment.

3D hands/fire update: all 13 Node tests pass, including mirrored volumetric hands, grab curl/reopen, and authoritative breath effect origin/direction. Client/module syntax checks pass. Browser visual verification was inconclusive because preview interaction did not reliably enter the kaiju view; no headset validation performed.


Strategic combat update: no automated tests or browser/headset playtests run, per user preference. Earlier passing results apply to the preceding build only. New facility balance, stamina/block controls, repair crews and feedback need playtesting.
