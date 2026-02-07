// Complete CYOA Data - All options from source documents
export const CYOA_DATA = {
    modes: [
        { id: 'venerable', name: 'Venerable', points: 10000, description: 'Walk the path of the supreme, shape reality itself!' },
        { id: 'easy', name: 'Easy', points: 2500, description: 'A favorable start with room for growth.' },
        { id: 'normal', name: 'Normal', points: 1000, description: "The standard cultivator's journey, balancing challenge and opportunity." },
        { id: 'hard', name: 'Hard', points: 500, description: 'Forge greatness from adversity, overcoming all obstacles. Defy fate with nothing but will.' }
    ],

    // All paths available in the Gu world
    paths: [
        'blade',
        'blood',
        'bone',
        'cloud',
        'dark',
        'dream',
        'drawing',
        'earth',
        'emotion',
        'enchantment',
        'enslavement',
        'fire',
        'food',
        'formation',
        'heaven',
        'human',
        'ice',
        'illusion',
        'information',
        'killing',
        'light',
        'lightning',
        'luck',
        'metal',
        'moon',
        'painting',
        'phantom',
        'pill',
        'poison',
        'qi',
        'refinement',
        'restriction',
        'rule',
        'shadow',
        'snow',
        'soul',
        'sound',
        'space',
        'star',
        'strength',
        'sword',
        'theft',
        'time',
        'transformation',
        'water',
        'weapon',
        'wind',
        'wisdom',
        'wood'
    ],


    categories: {
        timeline: {
            type: 'single',
            title: 'Timeline',
            description: 'Choose when you enter the Gu world',
            options: [
                {
                    id: 'timeline-first',
                    name: 'First Timeline',
                    cost: 150,
                    description: 'Born November 11th, same time as Fang Yuan. Spectral Soul succeeds, Spring Autumn Cicada never refined. Fang Yuan becomes demonic powerhouse with blood deity.',
                    disables: []
                },
                {
                    id: 'timeline-second',
                    name: 'Second Timeline (Canon)',
                    cost: 0,
                    description: "Born same time as Fang Yuan's first life. His will travels 500 years back before awakening ceremony. Heaven's will protects him from lethal attempts.",
                    disables: []
                },
                {
                    id: 'timeline-alternative',
                    name: 'Alternative Timeline',
                    cost: 300,
                    description: 'You ARE Fang Yuan - he never transmigrates. No Spring Autumn Cicada, but all other benefits. Skip race, location, appearance.',
                    disables: ['prep', 'race', 'sex', 'appearance', 'clanTier', 'clanStatus']
                }
            ]
        },

        prep: {
            type: 'single',
            title: 'Extra Preparation',
            description: '',
            options: [
                {
                    id: 'prep-extra',
                    name: 'Extra Prep Time',
                    cost: -50,
                    description: 'Additional 20 years of preparation time (not available for Alternative Timeline)'
                }
            ]
        },

        race: {
            type: 'single',
            title: 'Race',
            description: '',
            options: [
                { id: 'race-random', name: 'Random Race', cost: 300, description: 'Born as random race - variant or normal human. All up to luck.' },
                { id: 'race-variant', name: 'Variant Human', cost: 150, description: 'Choose any variant human. If dragonman, start your own bloodline as ancestor, immune to Duke Long\'s extermination move.' },
                { id: 'race-human', name: 'Human', cost: 0, description: 'Safe choice. Though nothing is truly safe in the Gu world.' }
            ]
        },

        sex: {
            type: 'single',
            title: 'Sex',
            description: '',
            options: [
                { id: 'sex-choice', name: 'Choose Sex', cost: 0, description: 'Choose which sex you are born as.' },
                { id: 'sex-random', name: 'Random Sex', cost: 50, description: 'Randomly determined.' }
            ]
        },

        appearance: {
            type: 'single',
            title: 'Appearance',
            description: '',
            options: [
                { id: 'appear-ugly', name: 'Extremely Unattractive', cost: 50, description: "Ugly enough to ruin someone's day." },
                { id: 'appear-average', name: 'Average Appearance', cost: 0, description: 'Extremely average appearance.' },
                { id: 'appear-attractive', name: 'Extremely Attractive', cost: -50, description: 'People subconsciously treat you better.' }
            ]
        },

        specialTraits: {
            type: 'multiple',
            title: 'Special Traits',
            description: 'Multiple selection allowed',
            options: [
                { id: 'trait-memory', name: 'Eidetic Memory', cost: -50, description: 'Perfect memory. Natural human path Dao marks imitating wisdom path.' },
                { id: 'trait-strength', name: 'Innate Strength', cost: -50, description: 'Break fingers as baby, strength of many men as adult.' },
                { id: 'trait-transhuman', name: 'Transhumanist', cost: -200, description: 'Cannot lose sense of self or humanity. Extreme mental resistance.' }
            ]
        },

        clanTier: {
            type: 'single',
            title: 'Clan Tier',
            description: 'Choose your birthplace',
            hasSubOptions: true,
            options: [
                {
                    id: 'clan-mortal',
                    name: 'Mortal Village',
                    cost: 150,
                    description: 'You and one parent are the only Gu masters.',
                    statusOptions: [
                        { id: 'status-mortal-heir', name: 'Rank 2 Heir', cost: 50 }
                    ]
                },
                {
                    id: 'clan-mid',
                    name: 'Mid-tier Clan',
                    cost: 50,
                    description: 'Respectable clan with resources.',
                    statusOptions: [
                        { id: 'status-mid-r2', name: 'Rank 2 Heir', cost: 50 },
                        { id: 'status-mid-elder', name: 'Heir of Elder', cost: 0 },
                        { id: 'status-mid-leader', name: 'Heir of Clan Leader', cost: -50 }
                    ]
                },
                {
                    id: 'clan-high',
                    name: 'High-tier Clan',
                    cost: -50,
                    description: 'Powerful clan with significant influence.',
                    statusOptions: [
                        { id: 'status-high-random', name: 'Random', cost: 50 },
                        { id: 'status-high-r2', name: 'Rank 2 Heir', cost: 0 },
                        { id: 'status-high-elder', name: 'Heir of Elder', cost: -50 },
                        { id: 'status-high-leader', name: 'Heir of Clan Leader', cost: -100 }
                    ]
                },
                {
                    id: 'clan-super',
                    name: 'Super Clan',
                    cost: -100,
                    description: 'One of the dominant forces in the region.',
                    statusOptions: [
                        { id: 'status-super-random', name: 'Random', cost: 50 },
                        { id: 'status-super-r2', name: 'Rank 2 Heir', cost: 0 },
                        { id: 'status-super-elder', name: 'Heir of Elder', cost: -50 },
                        { id: 'status-super-r5', name: 'Heir of Rank 5', cost: -100 },
                        { id: 'status-super-immortal', name: 'Child of Immortal', cost: -250 }
                    ]
                }
            ]
        },

        specialBirth: {
            type: 'single',
            title: 'Special Birth',
            description: '',
            options: [
                {
                    id: 'birth-custom-immortal',
                    name: 'Customized Child of Immortal Expert',
                    cost: -400,
                    description: 'Singular offspring of two rank 6 Immortals. Design their personalities, choose location/clan affiliation. Each has rank 6 immortal gu and grandmaster attainment.',
                    needsInput: true,
                    inputLabel: 'Describe your immortal parents (personalities, clan, location):'
                }
            ]
        },

        aptitude: {
            type: 'single',
            title: 'Aptitude',
            description: "It's time to determine what dictates your mortal life, how you are treated, and your path across the mortal world. If you pick a grade, you will get a random aptitude within that aptitude range. You can roll a 2d10 or use a number generator to get a number between 0-19.",
            options: [
                { id: 'apt-random', name: 'Random Aptitude', cost: 150, description: 'Roll the dice on your talent.' },
                { id: 'apt-d', name: 'D-Grade (20%-39%)', cost: 50, description: 'Poor aptitude.' },
                { id: 'apt-c', name: 'C-Grade (40%-59%)', cost: 0, description: 'Average aptitude.' },
                { id: 'apt-b', name: 'B-Grade (60%-79%)', cost: -50, description: 'Above average.' },
                { id: 'apt-a', name: 'A-Grade (80%-99%)', cost: -100, description: 'Exceptional aptitude.' },
                { id: 'apt-extreme', name: 'Ten Extreme Physique', cost: -150, description: 'Choose physique. 2x attainment growth in its path.' },
                { id: 'apt-custom', name: 'Custom Extreme Physique', cost: -250, description: 'Choose two paths (not Heaven). Innate Dao Marks. 2x attainment growth.' }
            ]
        },

        luck: {
            type: 'multiple',
            title: 'Luck',
            description: "Choose your luck modifications, which will affect your life in various ways. These are lifelong, near-immutable modifications to your luck. Only a peak rank 8 could alter these.",
            options: [
                { id: 'luck-nemesis', name: 'Nemesis Luck', cost: 250, description: 'At each rank, find mortal enemy unusually strong for their rank.', negative: true },
                { id: 'luck-horizon', name: 'Horizon Graveyard Luck', cost: 200, description: "Everyone around you suffers falling luck.", negative: true },
                { id: 'luck-peach', name: 'Peach-blossom Luck', cost: -50, description: 'Very good luck with opposite sex.' },
                { id: 'luck-platinum', name: 'Platinum Luck', cost: -100, description: 'Stumble upon commercial opportunities, auctions. Buy low, sell high.' },
                { id: 'luck-dogshit', name: 'Dog Shit Luck', cost: -200, description: 'Greatly improved luck, as if by rank 6 Dog Shit Luck.' },
                { id: 'luck-fortune', name: 'Fortune Rivalling Heaven', cost: -400, description: 'Ma Hong Yun tier fortune. 2x luck path attainment growth.' }
            ]
        },

        soul: {
            type: 'multiple',
            title: 'Soul Foundation',
            description: "Buy each lower-level soul foundation to get a specific soul foundation, starting with the ten thousand man soul. Your body also gains the necessary Dao marks/alterations to contain such a powerful soul.",
            options: [
                { id: 'soul-10k', name: 'Ten Thousand Man Soul', cost: -50, description: 'Rank 5 expert soul.' },
                { id: 'soul-100k', name: 'Hundred Thousand Man Soul', cost: -100, description: 'Rank 6 immortal soul.', requires: ['soul-10k'] },
                { id: 'soul-1m', name: 'One Million Man Soul', cost: -100, description: 'Great expert soul.', requires: ['soul-100k'] },
                { id: 'soul-10m', name: 'Ten Million Man Soul', cost: -100, description: 'Soul path immortal level. 2x soul attainment growth.', requires: ['soul-1m'] }
            ]
        },

        venerable: {
            type: 'single',
            title: 'Venerable Inheritances',
            description: 'May only choose ONE venerable inheritance',
            options: [
                { id: 'ven-primordial', name: 'Primordial Origin', cost: -350, description: 'Base lifespan ×10. Life-extension ×2. Immune to lifespan drain.' },
                { id: 'ven-star', name: 'Star Constellation', cost: -500, description: 'All attainment gains ×2. Mental energy costs halved.' },
                { id: 'ven-limitless', name: 'Limitless', cost: -300, description: '3× Dao marks from any source (stacks with Dao Carver).' },
                { id: 'ven-reckless', name: 'Reckless Savage', cost: -400, description: 'Transfer true meaning to/from others. Force consent.' },
                { id: 'ven-genesis', name: 'Genesis Lotus', cost: -200, description: 'Store essence in aperture bank. 10% annual interest.' },
                { id: 'ven-thieving', name: 'Thieving Heaven', cost: -400, description: 'Complete venerable inheritance. Disrupts canon.' },
                { id: 'ven-redlotus', name: 'Red Lotus', cost: -250, description: 'One save slot. Upon death, will travels back.' },
                { id: 'ven-giant', name: 'Giant Sun', cost: -150, description: 'Receive all Luck category options for free.', grantsAllLuck: true },
                { id: 'ven-spectral', name: 'Spectral Soul', cost: -150, description: 'Unbreakable will. Ignore pain, despair. Soul path effects ×2.' },
                { id: 'ven-paradise', name: 'Paradise Earth', cost: -500, description: 'Born with 250 unrestrained heavenly Dao Marks.' },
                { id: 'ven-greatdream', name: 'Great Dream', cost: -200, description: 'Reach supreme grandmaster via dream realms. 2× dream attainment.' },
                { id: 'ven-heavenrefine', name: 'Heaven Refining', cost: -500, description: 'All your Dao marks are non-conflicting.' }
            ]
        },

        grabBagBundles: {
            type: 'single',
            title: 'Grab Bag Perks',
            description: "Grab bag perks are minor perks that are nice to have but not substantial enough to be full perks by themselves.",
            options: [
                { id: 'grab-3', name: '3 Grab Bag Perks', cost: -50, count: 3, description: "Pick 3 of any grab bag perks" },
                { id: 'grab-5', name: '5 Grab Bag Perks', cost: -100, count: 5, description: "Pick 5 of any grab bag perks" },
                { id: 'grab-7', name: '7 Grab Bag Perks', cost: -150, count: 7, description: "Pick 7 of any grab bag perks" },
                { id: 'grab-10', name: '10 Grab Bag Perks', cost: -200, count: 10, description: "Pick 10 of any grab bag perks" }
            ]
        },

        grabBagItems: [
            { id: 'grab-reading', name: 'Reading Materials', description: 'Popup window with Reverend Insanity novel and wiki.' },
            { id: 'grab-professor', name: 'Gu Professor', description: 'Always know if an immortal Gu exists.' },
            { id: 'grab-polyglot', name: 'Polyglot', description: 'Speak and read every region\'s language.' },
            { id: 'grab-1ksoul', name: 'Thousand Man Soul', description: 'Born with 1,000 man soul. Control 100,000+ beasts.' },
            { id: 'grab-otherworld', name: 'Otherworldly Dao', description: 'Choose which otherworldly Dao mark your soul comes with.' },
            { id: 'grab-settra', name: 'Settra', description: 'Slavery Gu (any rank) does not work on you.' },
            { id: 'grab-changewill', name: 'Change Will', description: 'Change an ideal to better fit Gu world.' },
            { id: 'grab-memories', name: 'Memories', description: 'Before birth, gain memories of mortal whole life.' },
            { id: 'grab-instant', name: 'Instant Success', description: 'Dao-marking Gu show full effects immediately and painlessly.' },
            { id: 'grab-mutated', name: 'Mutated Soul', description: 'Choose mutated soul type (e.g., wolfman soul).' },
            { id: 'grab-flying', name: 'Flying Master', description: 'Master-level attainment in flying.' },
            { id: 'grab-secret', name: 'Secret Manuals', description: '3 secret manuals for non-aperture cultivation.' }
        ],

        tier1: {
            type: 'multiple',
            title: 'Tier 1 Perks',
            description: '',
            options: [
                { id: 'tier1-wealth', name: 'Primeval Wealth', cost: -50, description: 'Rank 4 Primeval Elder Gu with 10 million primeval stones.', repeatable: true },
                { id: 'tier1-guset', name: 'Gu Set', cost: -50, description: 'Choose 10 Gu worms same path (rank 1-5). Instantly refinable.', repeatable: true },
                { id: 'tier1-combat', name: 'Close Combat Master', cost: -50, description: 'Battle genius. Mastered multiple martial arts and weapons.' },
                { id: 'tier1-recipes', name: 'Mortal Recipes', cost: -50, description: 'Select 10 mortal Gu, gain rank 1-5 recipes.', repeatable: true },
                { id: 'tier1-inhuman', name: 'Inhuman Transformations', cost: -50, description: 'Automatically control body when transformed to beastly form.' },
                { id: 'tier1-flyinggm', name: 'Flying Grandmaster', cost: -50, description: 'Grandmaster flying proficiency.' },
                { id: 'tier1-longevity', name: 'Longevity', cost: -50, description: 'Hundred-year lifespan Gu.' }
            ]
        },

        tier2: {
            type: 'multiple',
            title: 'Tier 2 Perks',
            description: '',
            options: [
                { id: 'tier2-dualdao', name: 'Dual Dao', cost: -100, description: 'Choose two paths - they don\'t interfere.', conflicts: ['draw-daomono'] },
                { id: 'tier2-variantdao', name: 'Variant Dao', cost: -100, description: 'Great grandmaster in race\'s path. 2× attainment growth.', requires: ['race-variant'] },
                { id: 'tier2-secondap', name: 'Second Aperture', cost: -100, description: 'Awaken second aperture when chosen. No rank restriction.' },
                { id: 'tier2-superguset', name: 'Superior Gu Set', cost: -100, description: 'Pick 10 Gu worms (up to rank 5). Never need feeding.', repeatable: true, maxCount: 2 },
                { id: 'tier2-immortalrecipes', name: 'Immortal Recipes', cost: -100, description: 'Choose 10 Gu worms. Obtain rank 1-9 recipes for each.' },
                { id: 'tier2-borndao', name: 'Born Dao', cost: -100, description: 'Born with 50 Dao Marks in chosen path.', repeatable: true, uniquePerPath: true },
                { id: 'tier2-experience', name: 'Experience', cost: -100, description: 'Before birth, experience random Gu master\'s life to rank 6 and death.' },
                { id: 'tier2-growth', name: 'Growth', cost: -100, description: 'Choose path. 2× attainment growth in it.', repeatable: true, uniquePerPath: true },
                { id: 'tier2-greatlove', name: 'Great Love', cost: -100, description: 'Grandmaster in social manipulation, reading people.' }
            ]
        },

        tier3: {
            type: 'multiple',
            title: 'Tier 3 Perks',
            description: '',
            options: [
                { id: 'tier3-vitalgu', name: 'Vital Gu', cost: -150, description: 'Vital Gu + 2 others guaranteed advance to rank 6.' },
                { id: 'tier3-inheritance', name: 'Great Era Inheritance', cost: -150, description: 'Rank 6 immortal inheritance. 500 years ahead.' },
                { id: 'tier3-reinforced', name: 'Reinforced Physique', cost: -150, description: 'No downsides from extreme physique.', requires: ['apt-extreme', 'apt-custom'] },
                { id: 'tier3-autobalance', name: 'Auto Balancer', cost: -150, description: 'Heaven, Earth, Human Qi automatically balanced. Guaranteed pass.' }
            ]
        },

        tier4: {
            type: 'multiple',
            title: 'Tier 4 Perks',
            description: '',
            options: [
                { id: 'tier4-clone', name: 'Clone', cost: -250, description: 'Create clone anytime. Choose if clone shares perks/attainment.', conflicts: ['draw-indivisible'] },
                { id: 'tier4-servant', name: 'Servant of Heaven', cost: -250, description: 'Heaven\'s Will ally. Easier tribulations. 2× heaven attainment.' },
                { id: 'tier4-hidden', name: 'Hidden Danger', cost: -200, description: 'Suppress aura to nothing or pretend multiple ranks lower.' },
                { id: 'tier4-lifedeath', name: 'Life and Death Aperture', cost: -200, description: 'Half-strength tribulations, same Dao marks. Guaranteed high-grade blessed land.' },
                { id: 'tier4-daocarver', name: 'Dao Carver', cost: -300, description: '2× Dao marks from any source. Peak rank 8 prospects.' },
                { id: 'tier4-antidiv', name: 'Anti-Divination', cost: -300, description: 'Rank 9 perpetual killer move. Only rank 9 wisdom can deduce you. Toggleable.' },
                { id: 'tier4-rank8inherit', name: 'Rank 8 Inheritance', cost: -250, description: 'Rank 8 inheritance (1-2 paths, not heaven). Smooth cultivation.' },
                { id: 'tier4-pocket', name: 'Pocket Paradise', cost: -300, description: 'Portable blessed land orb (7,000m², 40× time). No tribulations.' }
            ]
        },

        tier5: {
            type: 'multiple',
            title: 'Tier 5 Perks',
            description: 'Each additional Tier 5 perk after first costs +200 CP extra',
            options: [
                { id: 'tier5-dreamven', name: 'Small Dream Immortal Venerable', cost: -150, description: 'Master attainment in every path. No restrictions on grandmaster/great grandmaster. Attainment cost halved.', removesAttainmentLimits: true },
                { id: 'tier5-maps', name: 'Gu Maps', cost: -200, description: 'Perfect map of entire Gu world in head. Updates yearly.' },
                { id: 'tier5-prodigy', name: 'Prodigy', cost: -200, description: 'Choose path: great grandmaster attainment, 4× growth, supreme grandmaster potential.' },
                { id: 'tier5-legendary', name: 'Legendary Expert', cost: -350, description: 'Quasi-supreme grandmaster in chosen path. Undisputed expert alive.' },
                { id: 'tier5-vitalext', name: 'Vital Gu Extension', cost: -150, description: 'Choose any Gu (except SAC). Becomes additional Vital Gu. Advances to rank 9 automatically.' },
                { id: 'tier5-pathfounder', name: 'Path Founder', cost: -200, description: 'Create own path. Start at master, 2× attainment growth, supreme grandmaster potential.' }
            ]
        },

        premiumGu: {
            type: 'multiple',
            title: 'Premium Gu Worms',
            description: "These are special Immortal Gu that have transcended the limit of gu world, it is as if they were the apex masterpiece of a venerable. Only venerables could make them from scratch, while great grandmaster attainment in their path is needed to advance them past rank 6. They won’t need to be fed for 30 years and can fit in mortal apertures. Upon choosing these worms you learn its recipe for rank 6 and may choose when these Gu worms appear in your aperture. You cannot choose these worms from any other perk.",
            options: [
                { id: 'premium-breakdream', name: 'Break Dream', cost: -150, description: 'Dream Path. Destroys dream realms, counters dream path entities.' },
                { id: 'premium-mastergu', name: 'Master of Gu', cost: -250, description: 'Human Path. Complete Reverend Insanity including unwritten chapters. Carves Dao marks.' },
                { id: 'premium-ptv', name: 'Path to Victory', cost: -350, description: 'Wisdom Path. Create optimal step-by-step plans accounting for unknown factors.' },
                { id: 'premium-tribulation', name: 'Tribulation', cost: -250, description: 'Heaven Path. Causes random tribulations against targets. Frequent use angers Heaven\'s Will.' },
                { id: 'premium-chaos', name: 'Chaos Flame Gu', cost: -200, description: 'Fire/Human, Consumable. Flame attached to soul. Summonable weapon. Nurtures body/soul.' },
                { id: 'premium-solvent', name: 'Universal Solvent Gu', cost: -200, description: 'Water/Refinement. Creates refinement water. Strips Dao marks from materials.' },
                { id: 'premium-selfoppression', name: 'Self Oppression Gu', cost: -150, description: 'Enslavement. Enslaved entities burden own souls. Maintain control.' },
                { id: 'premium-centraltime', name: 'Heaven\'s on Central Time', cost: -150, description: 'Time, Consumable. Tribulation timing by central continent time.' },
                { id: 'premium-mobileform', name: 'Mobile Formation Immortal Gu', cost: -150, description: 'Formation. Move formation freely.' },
                { id: 'premium-innatestrength', name: 'Innate Strength Immortal Gu', cost: -150, description: 'Strength/Transformation. Gain innate strength of creature transformed into.' },
                { id: 'premium-humanstrength', name: 'Human Strength Gu', cost: -100, description: 'Human/Strength, Reusable. Gain strength of 25 human men permanently.' },
                { id: 'premium-partial', name: 'Partial Transformation Immortal Gu', cost: -150, description: 'Transformation/Rule. Combine best features from different transformations.' },
                { id: 'premium-humanvessel', name: 'Human Vessel Gu', cost: -200, description: 'Human, Reusable. Better withstand Dao marks with reduced conflict.' },
                { id: 'premium-danghun', name: 'Dang Hun Gu', cost: -200, description: 'Soul, Reusable. Expend soul foundation to create Guts Gu.' }
            ]
        },

        missions: {
            type: 'multiple',
            title: 'Missions',
            description: "These are objectives that give you extra points, but you have to complete them within 300 years of central content time or you explode and die. Spectral Soul eats your soul, and Heaven's Will foils any rival methods. You cannot escape the consequence of not completing your missions. You may pick as many missions as you want.",
            options: [
                { id: 'mission-traditional', name: 'Traditional', cost: 100, description: 'Create inheritance and suitable inheritance ground with trials/requirements.' },
                { id: 'mission-paradise', name: 'Paradise', cost: 100, description: 'Enter Grotto-Heaven Blue Dragon Whale at least once.' },
                { id: 'mission-kill', name: 'Problem? KILL!', cost: 150, description: 'Destroy a super force. Must make it cease to exist.' },
                { id: 'mission-founding', name: 'Founding Ancestor', cost: 150, description: 'Create super force. Must nurture at least one immortal besides yourself.' },
                { id: 'mission-secluded', name: 'Secluded Domain', cost: 200, description: 'Obtain and own secluded domain for one month.' },
                { id: 'mission-supreme', name: 'Supreme Inheritance', cost: 200, description: 'Obtain complete true inheritance of any venerable.' },
                { id: 'mission-homewrecker', name: 'Homewrecker', cost: 300, description: 'Destroy 88 True Yang building with YOUR direct involvement.' },
                { id: 'mission-heavenly', name: 'Heavenly Court', cost: 600, description: 'Join Heavenly Court, loyally serve its interests.' },
                { id: 'mission-david', name: 'David and Goliath', cost: 150, description: 'As mortal: defeat cultivator 3 ranks above OR rank 6 immortal. As immortal: defeat Gu Immortal one rank above.' },
                { id: 'mission-feng', name: 'Eliminate Feng Jin Huang', cost: 100, description: 'Personally kill Feng Jin Huang. Fail if killed without your involvement.' },
                { id: 'mission-guardian', name: 'Eliminate Dao Guardian', cost: 100, description: 'Personally kill a Dao Guardian. Fail if killed without your involvement.' }
            ]
        },

        drawbacks: {
            type: 'multiple',
            title: 'Drawbacks',
            description: "You may take as many drawbacks as you want. However, you may not take drawbacks more than once. Drawbacks overwrite other options picked in this character creator.",
            options: [
                { id: 'draw-nospoilers', name: 'No Spoilers', cost: 50, description: 'Cannot share Reverend Insanity contents with anyone.' },
                { id: 'draw-daomono', name: 'Dao Monogamous', cost: 100, description: 'Other paths interfere 2× more with vital Gu path.', conflicts: ['tier2-dualdao'] },
                { id: 'draw-unundead', name: 'Un-undead', cost: 100, description: 'Cannot become zombie. No fail-safe. Must pay price for Light of Wisdom.' },
                { id: 'draw-trueword', name: 'True to Your Word', cost: 100, description: 'Never break alliance agreements. Contract/alliance Dao marks never forcefully removable.' },
                { id: 'draw-mistress', name: 'Like a Mistress', cost: 150, description: 'Owned Gu worms need 3× food to be properly fed.' },
                { id: 'draw-halflife', name: 'Halved Lifespan', cost: 200, description: 'Lifespan halved (human: 50 years). Life-extension methods only half effective.' },
                { id: 'draw-daodunce', name: 'Dao Dunce', cost: 300, description: 'Cannot increase attainment beyond what you buy in character creator.' },
                { id: 'draw-indivisible', name: 'Indivisible', cost: 300, description: 'Cannot create clones. Others cannot clone you either.', conflicts: ['tier4-clone'] },
                { id: 'draw-ofworld', name: 'Of This World', cost: 300, description: 'Soul and body are of Gu world. Only memories from Earth. Lose otherworldly soul and Dao marks.' },
                { id: 'draw-truthbound', name: 'Truthbound', cost: 250, description: 'Cannot knowingly lie. Cannot avoid answering questions. May be misleading/deceptive.' },
                { id: 'draw-defy', name: 'Defy Reality', cost: 250, description: 'Cannot knowingly tell truth. With Truthbound: never speak/write/use Gu for words.' },
                { id: 'draw-cliche', name: 'Clichéd Daoist', cost: 100, description: 'Run into xianxia literary conventions. Glance at jade beauty? Courting death!' },
                { id: 'draw-fangyuan', name: 'Enemy - Fang Yuan', cost: 100, description: 'Fang Yuan knows your powers/exploits, plans to exploit you. Has venerable support.', requiresTimeline: 'timeline-second' },
                { id: 'draw-shadow', name: 'Enemy – Shadow Sect', cost: 200, description: 'Shadow Sect tries to kill you after drawing attention or becoming immortal.' },
                { id: 'draw-heavenlycourt', name: 'Enemy – Heavenly Court', cost: 200, description: 'After becoming immortal, Heavenly Court concludes you\'re enemy of Heaven\'s Will.' },
                { id: 'draw-principled', name: 'Principled Protagonist', cost: 250, description: 'Cannot take demonic actions (Gu World AND Earth view). No Geneva Convention violations.' },
                { id: 'draw-lone', name: 'Lone Cultivator', cost: 250, description: 'Never ally with anyone longer than 24 hours (combat or cultivation).' },
                { id: 'draw-filial', name: 'Filial Promise', cost: 300, description: 'May not attack human or variant human with intent to kill.' }
            ]
        }
    }
};

export const ATTAINMENT_COSTS = {
    master: 50,
    grandmaster: 100,
    greatgrandmaster: 200
};

export const ATTAINMENT_LIMITS = {
    grandmaster: 4,
    greatgrandmaster: 2
};