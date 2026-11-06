# CHARACTER CUSTOMIZATION — adding a new character

1. Add a spec to `LL.CharacterSpecs` in `src/character.js`:
```js
laila: { name: 'Laila', body: 0.72, width: 0.8, headR: 0.43, headW: 1.08, jaw: 0.08, cheek: 0.14, faceFlat: 0.9,
  eye: 0.33, eyeX: 0.37, eyeY: 0.2, mouthY: 0.62, noseY: 0.44, nose: 0.85, limb: 1.25, browW: 0.9,
  skin: '#c48a66', hairColor: '#1c1310', hairHi: '#5a3a28', hair: 'pigtailCurls', outfit: 'partyDress', eyeColor: [50, 34, 28] }
```
2. Parameters: `body` (height scale; adults 1.0, teen ~0.88, child ~0.72), `width`, `headR` (children keep a relatively larger head), `headW`, `jaw`, `cheek`, `faceFlat`, `eye*`/`mouth*`/`nose*` (face layout in head-radius units), `limb`, `brow*`, `neckW`, `headDrop`, `hem`, `flare`, `sleeve`, colours, `hair`, `outfit`, `eyeColor`.
3. Hair: write a style in `LL.HairStyles` using `LL.HairKit` (`cap`, `sweep`, `ribbon`, `coil`, `tendril`). A short-curl/afro style is a cap + dense `coil` field; braids are interleaved `ribbon`s; ponytails a `sweep` to a tie point + hanging `ribbon`.
4. Outfit: add to `LL.Outfits`; reuse the torso/skirt/sleeve skinning helpers.
5. Render `tools/compare.py <tag> <who>` and compare against the reference before using it in game.

All characters share the 30-bone skeleton, so every animation clip and IK target works unchanged.
