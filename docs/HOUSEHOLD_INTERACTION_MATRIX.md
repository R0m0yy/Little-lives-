# HOUSEHOLD INTERACTION MATRIX (Addendum §13)

Legend — ✅ implemented & observed in a test run · 🟡 partial · ⬜ not built.
Columns: **AI** selection · **Nav** walks to approach point · **Align** faces/IK on target · **Anim** character animation · **Obj** object animates · **SFX** · **State** persistent state · **Save** survives save/load · **Recov** abort/failure recovery.

## Kitchen (built)
| Object | Actions | AI | Nav | Align | Anim | Obj | SFX | State | Save | Recov |
|---|---|---|---|---|---|---|---|---|---|---|
| Ceiling chandelier + wall switch | on / off | ✅ dark room / leaving / bed | ✅ | ✅ hand IK on switch | ✅ | ✅ toggle flips, real point light | ✅ | ✅ | ✅ | ✅ |
| Counter lamp | on / off | ✅ cozy personality, dusk | ✅ | ✅ | ✅ | ✅ real light | ✅ | ✅ | ✅ | ✅ |
| Refrigerator | open, take ingredients, close | ✅ | ✅ | ✅ | ✅ | ✅ hinged door + interior light | ✅ | ✅ | ✅ | ✅ auto-close on abort |
| Range burners 0/3 | ignite, heat, cook, off | ✅ | ✅ | ✅ knob IK | ✅ | ✅ glow light + steam | ✅ | ✅ off/heating/cooking | ✅ | ✅ |
| Pot | raw → cooking → cooked → portions | ✅ | — | ✅ | ✅ stir loop | ✅ food mesh + steam | ✅ | ✅ | ✅ | ✅ |
| Cutting board + knife | lay out, chop | ✅ | ✅ | ✅ | ✅ chop loop | ✅ whole→chopped | ✅ | ✅ | ✅ | ✅ |
| Kettle | heat, whistle, pour | ✅ | ✅ | ✅ | ✅ | ✅ steam | ✅ | ✅ | ✅ | ✅ |
| Sink faucet | on / off, rinse, wash | ✅ | ✅ | ✅ | ✅ | ✅ water stream | ✅ | ✅ | ✅ | ✅ auto-off on abort |
| Plate / spoon / cup | carry, serve, set, clear, rack | ✅ | ✅ | ✅ two-hand carry | ✅ | ✅ food shrinks as eaten | ✅ | ✅ | ✅ | ✅ |
| Dining chair | pull out, sit, stand, tuck in | ✅ | ✅ | ✅ | ✅ | ✅ chair slides | ✅ | ✅ | ✅ | ✅ |
| Kitchen door | open / close | ✅ | ✅ | ✅ | ✅ | ✅ hinged | ✅ | ✅ | ✅ | 🟡 no occupancy (one agent) |
| Telephone | call family | ✅ | ✅ | ✅ | ✅ talk | ✅ handset lifts | ✅ ring | ✅ | ✅ | ✅ |
| Book (shelf) | read at table | ✅ | ✅ | ✅ | ✅ | ✅ opens | — | ✅ | ✅ | ✅ |
| Window, curtains, clock | gaze; curtain sway; clock hands follow sim time | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |

## Rest of the house (not built yet — Milestone 6/8)
| Room | Objects required by addendum | Status |
|---|---|---|
| Bathroom | toilet (lid, seat, flush, water, SFX, privacy cam), sink, toothbrush, bath, towels, light, door w/ occupancy | ⬜ |
| Bedrooms ×3 | door, bedside lamp, wardrobe/pajamas, bed (unmade/made, blanket blend shapes), sleep breathing | ⬜ (sleep currently off-room, labelled honestly) |
| Living room | TV + remote + original channels, sofas, fireplace ignite/extinguish + crackle, lamps, books | ⬜ |
| Dining room | table setting for 4, conversation at meals, clearing | 🟡 kitchen table covers 1 diner |
| Study / kids' rooms | desk lamp, books, writing, computer + keyboard, game console, toys, drawing | ⬜ |
| Stairs & halls | multi-floor nav, climb/descend clips, hall lights, porch light | ⬜ |
| Household audio | footsteps on wood ✅, doors ✅, switches ✅, water ✅, cooking ✅ · toilet, TV, fire, bed, breathing, night ambience ⬜ | 🟡 |

## Reusable component mapping
Today these behaviours live in `sim.js` step lists. Planned refactor before the second room: extract `SwitchableObject`, `OpenableObject`, `SeatInteraction`, `WaterFixture`, `ApplianceInteraction`, `CarryableObject`, `ConsumableObject`, `DoorInteraction`, `BedInteraction` as data-driven components (approach point, IK targets, state machine, SFX, reservation) so the bathroom/bedrooms reuse them instead of new hand-written steps.
