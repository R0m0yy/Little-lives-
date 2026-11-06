# Little Lives — Art Bible (v0.1, Milestone 1)

## Two-layer look
1. **Environment = realistic miniature.** Painted wood, butcher block, cast iron, brass, ceramic, wallpaper, slate, all lit as tabletop photography: warm practical lamps, a soft key from the "real" room in front, and a strongly defocused living room behind.
2. **Characters = collectible stylised dolls.** Big round heads (≈1/3 height), very large glossy eyes, button nose, small mouth, sculpted clump hair, compact bodies, mitten hands. They read as handcrafted figurines, not people.

## Palette
| Use | Colours |
|---|---|
| Kitchen | cream cabinet `#efe3c8`, trim `#f6efe0`, butcher block `#c28b55`, iron `#1f1c1b`, brass `#c99a45`, copper `#b8673a` |
| Walls | cream damask wallpaper `#efe2c6` with rose-tan motifs, white subway tile |
| Exterior (Ref B) | cream siding `#efe5d0`, white trim, slate roof `#4a5866`–`#7889a0` |
| Naomi | skin `#c98d68`, hair `#4a2b1f`, blouse `#f4e8d4`, floral dress (cream + rose/peach/blue), rose underskirt `#7a2e2c`, shoes `#5e321f`, gold `#d6a548` |
| UI | glass cream `rgba(250,244,233,.86)`, plum `#5b3b52`, ink `#3b2a22` |

## Lighting rules
- **Day:** cool window light plus warm fill through the open front. Lamps are off unless Naomi turns them on.
- **Dusk/night:** the chandelier (2.4 intensity, warm 2700K-ish) and the counter lamp carry the room; the window turns deep blue; the dormer and neighbouring windows glow.
- Stove burners, the oven and the fridge interior are real light sources tied to object state.
- DOF is always on. Overview aperture 1.6 (background melts, the house stays crisp). Close shots 2.3–2.4 (tilt-shift miniature feel).

## Materials (shader parameters)
| Material | spec | shininess | wrap | notes |
|---|---|---|---|---|
| Skin | 0.12 | 0.30 | 0.55 | warm terminator tint + rim 0.25 |
| Eyes | 0.9 | 0.95 | 0.1 | baked + live catch-lights |
| Hair | 0.12 | 0.30 | 0.15 | strand-streak texture, rim 0.35 |
| Cloth | 0.05–0.08 | 0.2 | 0.3 | floral / lace / linen textures |
| Brass/copper | 0.85–0.9 | 0.8 | 0 | |
| Painted wood | 0.12 | 0.35 | 0.1 | brush-streak texture |

## Do / don't
- **Do** keep silhouettes soft and readable from the overview distance.
- **Do** give every functional object a visible state change.
- **Don't** use photoreal humans, low-poly box people, flat sticker eyes, or stock character packs.
- **Don't** redesign the Reference B house. Modules must slot into its 3×3 cutaway.
