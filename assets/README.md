# Sprite artwork

Generated with OpenAI ImageGen for Kaiju1v1 on 2026-09-27.

- hand.png: isolated moss-green kaiju hand and forearm; transparent alpha. Mirrored in the renderer for the opposite hand.
- monster.png: overhead kaiju marker for the defender map; transparent alpha.
- turret.png: armored cannon marker; transparent alpha.
- building.png: overhead rooftop marker; transparent alpha.
- facade.png: edge-to-edge office facade surface.

The original PNGs are bundled locally and do not require a CDN or image-generation service at runtime. The renderer creates capped-size GPU textures and overlays cracks for damage states; source PNGs remain unchanged. Tank and fallback icons are code-drawn in sprites.js.
