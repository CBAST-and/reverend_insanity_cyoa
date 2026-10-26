# Content review: comparison with the source CYOAs

This file records how the content in `content/content.json` was checked against the three CYOAs of the reference
document (alphanumericsprawl, smie27 4.0 and GashGrunt's Expanded), what was merged, and what was left out on purpose.
Current content: **160 options**, version `2026-10-26.1`.

## Method

Every option of each CYOA was extracted from the document and matched against the content by name. Costs and
descriptions were then compared one by one.

## Result by source

- **GashGrunt, The Expanded Reverend Insanity CYOA:** the content already reflects it completely. Every option, clan
  status, grab bag item, premium Gu, mission and drawback is present with the same cost. The few mismatches the
  comparison reported were repeated names (for example "Random" or "Heir of an elder", which exist under several tiers).
  This is the base of the content, so its prices and rules win whenever the sources disagree.
- **alphanumericsprawl:** starts from 20 points, so his prices were multiplied by 50 to reach a 1000 baseline. Most of his
  options were already in the content. Nine were missing and were added (Drop-in, Flawed Savant, Master of All,
  Overflowing Human Qi, Extra Gu Worm, Mercantile Soul, World Map, Supreme Almanac and Benefits Addict).
- **smie27, Reverend Insanity CYOA 4.0:** starts from 1500 points. 29 of its entries had no match by name,
  and 21 real options were added from it (below). The rest were renamed duplicates or the sections described under
  "Not added".

## Options added from the 4.0

Perks keep their listed price, because Tier 1 to Tier 3 perks cost the same in both CYOAs (−50, −100, −150) and
the Tier 4 prices fall inside the existing range. Timelines, missions and drawbacks were halved and rounded to the
nearest 50: in the options both CYOAs share, the Expanded prices for those categories are about half of the 4.0
prices (median ratio 2.0).

| Option | Where | 4.0 price | Price here |
|---|---|---|---|
| Late Antiquity Righteous Era | Origins | +250 | +150 |
| Late Antiquity Demonic Era | Origins | +450 | +250 |
| Wealth of Food | Perks / Tier 2 | -100 | -100 |
| Year Essence Pool | Perks / Tier 2 | -100 | -100 |
| Dream Realm | Perks / Tier 3 | -150 | -150 |
| Immortal Killer Moves | Perks / Tier 3 | -150 | -150 |
| Dao Physique | Perks / Tier 3 | -150 | -150 |
| Gu House | Perks / Tier 4 | -250 | -250 |
| Imperial Staff | Perks / Tier 4 | -250 | -250 |
| Extra Time | Challenges / Missions | -100 | -50 |
| Imperial Court | Challenges / Missions | +200 | +100 |
| Grand Theft Gu | Challenges / Missions | +400 | +200 |
| Become Venerable | Challenges / Missions | +400 | +200 |
| Supremacy | Challenges / Missions | +800 | +400 |
| Pseudo Venerable | Challenges / Missions | +300 | +150 |
| Dao Opponent | Challenges / Missions | +300 | +150 |
| Local Dao | Challenges / Drawbacks | +200 | +100 |
| Weakness | Challenges / Drawbacks | +200 | +100 |
| Inhospitable Environment | Challenges / Drawbacks | +300 | +150 |
| Clear Conscience | Challenges / Drawbacks | +300 | +150 |
| Forget Me Now | Challenges / Drawbacks | +400 | +200 |

Modeling notes:

- **Dao Physique** disables the whole Aptitude section ("don't pick anything in the aptitude section").
- **Supremacy** requires the Variant Human race ("as a variant human").
- **Pseudo Venerable** and **Dao Opponent** are only meant for the two Late Antiquity timelines. The rules engine can
  only express "requires all of", not "requires one of", so they conflict with the other three timelines instead.
- **Weakness** is repeatable ("you can pick this multiple times").
- **Local Dao** conflicts with Of This World, and **Clear Conscience** with Truthbound and Defy Reality, because each pair
  describes the same restriction.
- **Forget Me Now** says it removes the Reading Materials grab bag perk; that interaction is described in the text but
  not enforced.

## Descriptions

The descriptions in the content are shortened versions of the 4.0 texts. Where the 4.0 text only adds narrative or
clarification, it replaced the shorter one: First Timeline, Reinforced Physique, Auto Balancer, Problem? KILL!, No Spoilers, Dao Dunce.

Where the 4.0 text adds or changes a rule that GashGrunt dropped or changed, the Expanded wording was kept:

- Secluded Domain (the 4.0 lets you take it three times).
- Immortal Recipes (the 4.0 lets you pick it twice).
- Rank 8 Inheritance (different aspect rules).
- Second Aperture (Dual Dao interaction).
- Prodigy (the 4.0 grants venerable talent instead of 4x growth), Legendary Expert (two paths in the 4.0, one in the
  Expanded), Founding Ancestor (different objective) and Dao Monogamous (extra exception for Reckless Savage).

## Costs that differ and were kept

GashGrunt rebalanced these on purpose, so the content keeps his prices.

| Option | 4.0 price | Price here |
|---|---|---|
| First timeline | +300 | +150 |
| Variant Human | +250 | +150 |
| One million man soul | -200 | -100 |
| Ten million man soul | -300 | -100 |
| Auto balancer | -100 | -150 |
| Life and death aperture | -150 | -200 |
| Pocket paradise | -400 | -300 |
| Prodigy | -350 | -200 |
| Small Dream Immortal Venerable | -400 | -150 |
| Legendary expert | -400 | -350 |
| Paradise | +200 | +100 |
| Supreme inheritance | +300 | +200 |
| Problem? KILL! | +350 | +150 |
| Homewrecker | +400 | +300 |
| Founding ancestor | +500 | +150 |
| True to your word | +200 | +100 |
| Like a mistress | +350 | +150 |
| Halved lifespan | +300 | +200 |
| Dao dunce | +800 | +300 |

## Not added

- **Starting blessed land size** (4.0): four options with land area and resource production. It needs a new section in the
  content model and the database, so it was left out for now.
- **Grandmaster boon** (alphanumericsprawl): redundant, because the Attainments tab already sells that level for less.
- **Background tiers** (alphanumericsprawl): covered by Clan Tier and Special Birth.
- **Gugle Maps** (4.0): the same option as Gu Maps, which the content already has.
- **Late Antiquity timelines as missions' gate:** see the modeling notes above.
