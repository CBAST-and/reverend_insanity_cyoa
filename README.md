# Reverend Insanity CYOA

An interactive character sheet for the world of *Reverend Insanity* (蛊真人). Pick a difficulty, spend your creation
points (CP) on everything that defines your character, from the moment you enter the Gu world to your inheritances and
drawbacks, and share the result with a link.

**Try it at https://reverend-insanity-cyoa.pages.dev**

## How to use it

1. **Pick a difficulty.** It sets your starting points: 500, 1000, 2500 or 10000 CP.
2. **Go through the tabs** in the sidebar and choose what you want:
   - **Origins:** your timeline and extra preparation time.
   - **Character:** race, sex, appearance, aptitude and special traits.
   - **Birth:** clan tier and special birth.
   - **Fortune and Soul:** luck and soul foundation.
   - **Inheritances:** venerable inheritances, grab bag perks and premium Gu worms.
   - **Perks:** one sub-tab per tier, from Tier 1 to Tier 5.
   - **Challenges:** missions and drawbacks.
   - **Attainments:** your attainment level in each Dao path.
   - **Summary:** everything you picked, with its cost and the total.
3. **Watch your points.** The big number in the sidebar is what you have left, and each tab shows its own subtotal. A
   negative cost spends points; a positive one gives them back (drawbacks and missions do this). A red seal marks what
   you picked. If you overspend, the number turns red. You can explore over budget, but the build will be over budget.

If an option looks faded, you cannot pick it right now. Tap it and the site tells you why: a requirement is missing, it
conflicts with something you already picked, or an earlier choice disables that section. If you remove something other
options depend on, those options are removed too and the site tells you.

## Saving and sharing

- Press **Save and share** and your build gets a short address (`/b/xxxxxxxx`).
- **Copy link** gives an address anyone can open to view your build. It cannot be used to change it.
- **Copy edit link** gives an address with a secret key built in. Anyone who has it can edit the build, so keep it like a
  password. If you lose it, the build still exists but you can no longer change it from another browser; you can always
  open it and save a new copy.
- A saved build always opens with the rules and content it was created with, even if the site's content is updated later.
- Until you save, your draft stays in your browser and survives a page reload.

### Privacy

There are no accounts and no sign-up. What the server stores is your build and, only if you write it, the free text of the
immortal-parents option. Anyone with the public link can read it, so do not put personal information there. Your browser
keeps your draft and the edit keys of the builds you created in its local storage.

## Rules worth knowing

- **Requirements:** some options need others first (for example, soul foundations are chained).
- **Conflicts:** some options cannot be combined.
- **Repeatable options:** the ones that allow it have a counter and a maximum.
- **Tier 5:** every Tier 5 perk after the first costs 200 extra CP.
- **Attainments:** each path has its own level (Master, Grandmaster, Great Grandmaster) with limits per level, and each
  level has its own price. Some inheritances change those limits and prices.
- **Timelines:** choosing the alternative timeline disables the birth-related sections.

Each option explains its own rules in its description, which is the final reference.

## Help and feedback

If you find a bug, a rule that does not match the original CYOA, or something that looks wrong, open an issue in this
repository. The more specific the better: which options you picked, what you expected and what happened.

## For developers

Built with TypeScript, React and Cloudflare Pages with D1. The technical guide (architecture, database, API, admin and
deployment) is in [`docs/DESARROLLO.md`](docs/DESARROLLO.md), written in Spanish. To get started:

    npm install
    npm test
    npm run dev:full

## License and credits

The CYOA content is distributed under
[Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/).
Anyone who adapts it must keep these credits and share their work under the same license.

- Original CYOA: **alphanumericsprawl**, with contributions from **GashGrunt** and **smie27**.
- Premium Gu: **unlanned** and **WHOiAM981213**.
- Original interactive version: **WiseBein**.
- Based on the novel *Reverend Insanity* (蛊真人) by **Gu Zhen Ren**.

Details are in [`LICENSE.md`](LICENSE.md). The repository's own code does not declare a license yet.

This is a fan project with no connection to the authors or publishers of the novel.
