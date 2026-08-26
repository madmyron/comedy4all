# Game Plan: Joke Packs

**Date:** 2026-08-26  
**Status:** Approved (ship it)  
**One-liner:** Group jokes into theme tiles (Cat jokes, Getting older) where one joke can live in many packs.

---

## Goal

Joke Manager can show **pack tiles** with counts; open a pack to see its jokes. Same joke can sit in more than one pack.

## Out of scope

- Packs inside Set Builder (later)
- Sharing packs with other users
- Nested packs

## Options considered

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| A — `packs` text array on each joke | Simple, many-to-many, like tags | Rename updates many rows | Free |
| B — separate packs + join tables | Cleaner DB | More schema + UI | Free |
| C — tags only | Already exists | No folder tiles | Free |

**Recommendation:** A — packs as labels on jokes, tile view on top.

## Stack and hosting

- Comedy4All vanilla JS + Supabase
- SQL: `packs text[]` on `jokes`

## Milestones

1. SQL + normalize packs on load/save
2. Pack tiles / open pack / back
3. Assign packs in New + Edit joke
4. Rename / delete pack name across jokes

## Risks

- Column missing until SQL is run → show clear toast on sync fail

## Open questions

- None blocking

---

## Michael's approval

- [x] Game plan approved (ship it)
- [ ] Tickets approved for creation
