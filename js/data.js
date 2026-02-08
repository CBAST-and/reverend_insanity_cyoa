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
                    disables: ['prep', 'race', 'sex', 'appearance', 'clanTier', 'clanStatus', 'specialBirth', 'birth-custom-immortal']
                }
            ]
        },

        prep: {
            type: 'single',
            title: 'Extra Preparation',
            description: 'Extra preparation time before entering the Gu world',
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
            description: 'Choose your race and species in the Gu world',
            options: [
                { id: 'race-random', name: 'Random Race', cost: 300, description: 'Born as random race - variant or normal human. All up to luck.' },
                { id: 'race-variant', name: 'Variant Human', cost: 150, description: "You may choose to be born as any variant human. If you choose dragonman, then you start your own bloodline, with you as the ancestor instead of Duke Long. Thereby being immune to Duke Long's Dragonman Extermination killer move" },
                { id: 'race-human', name: 'Human', cost: 0, description: 'You may choose to be born as a human, a safe choice. Although nothing is safe in the Gu world.' }
            ]
        },

        sex: {
            type: 'single',
            title: 'Sex',
            description: "Determine your character's sex",
            options: [
                { id: 'sex-choice', name: 'Choose Sex', cost: 0, description: 'Choose which sex you are born as.' },
                { id: 'sex-random', name: 'Random Sex', cost: 50, description: 'Randomly determined.' }
            ]
        },

        appearance: {
            type: 'single',
            title: 'Appearance',
            description: 'Your physical appearance and attractiveness',
            options: [
                { id: 'appear-ugly', name: 'Extremely Unattractive', cost: 50, description: "You will have an extremely ugly appearance, enough to ruin someone's day should their gaze land upon you." },
                { id: 'appear-average', name: 'Average Appearance', cost: 0, description: 'You possess an extremely average appearance.' },
                { id: 'appear-attractive', name: 'Extremely Attractive', cost: -50, description: 'You have an extremely attractive appearance, and people will subconsciously treat you better because of it.' }
            ]
        },

        specialTraits: {
            type: 'multiple',
            title: 'Special Traits',
            description: 'Multiple selection allowed',
            options: [
                { id: 'trait-memory', name: 'Eidetic Memory', cost: -50, description: "You gain perfect eidetic memory. However, you may still forget things if you wish. This effect isn't from wisdom path Dao marks, but your natural human path Dao marks imitating wisdom path." },
                { id: 'trait-strength', name: 'Innate Strength', cost: -50, description: "You gain innate strength at birth. As a baby, you can break a grown man's fingers if you aren't careful. As an adult, you will have the strength of many men. This effect isn't from strength path Dao marks, but your natural human path Dao marks imitating the strength path." },
                { id: 'trait-transhuman', name: 'Transhumanist', cost: -200, description: "Human Path Dao Marks inscribe into you. You can no longer lose your sense of self or humanity and gain extreme resistance to anything that affects the mind. This allows permanent transformation into a beast, immersion in dream realms, or other experiences (or anything else really)." }
            ]
        },

        clanTier: {
            type: 'single',
            title: 'Clan Tier',
            description: "You may freely choose which of the five regions you are born into. You may choose any tier of clan and additionally choose which status you are born into in that clan. If you choose the central continent, you will be born to a sect member instead of in a clan. You may choose to be born into any clan/sect from the story or to be born into one at random according to the chosen criteria.",
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
                    description: "One of the dominant forces in the region. If you pick the Child of an immortal from Superclan, you will be the child of a random immortal from the super clan/sect you picked.",
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
            description: 'Special circumstances surrounding your birth',
            options: [
                {
                    id: 'birth-custom-immortal',
                    name: 'Customized Child of Immortal Expert',
                    cost: -400,
                    description: "You are the singular offspring of a pair of rank 6 Immortals. You have the liberty to design their personalities and choose the location and clan affiliation, within reasonable limits. They each possess a rank 6 immortal gu and have grandmaster attainment.",
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
                { id: 'apt-extreme', name: "Ten (Eleven) Extreme Physique", cost: -150, description: 'Choose physique. 2x attainment growth in its path.' },
                { id: 'apt-custom', name: 'Custom Extreme Physique', cost: -250, description: 'Choose two paths apart from Heaven. You are innately connected to this path starting with Dao Marks in these paths, and you also get 2x attainment growth in these paths.' }
            ]
        },

        luck: {
            type: 'multiple',
            title: 'Luck',
            description: "Choose your luck modifications, which will affect your life in various ways. These are lifelong, near-immutable modifications to your luck. Only a peak rank 8 could alter these.",
            options: [
                { id: 'luck-nemesis', name: 'Nemesis Luck', cost: 250, description: "During all stages of your cultivation, you will find a mortal enemy. At rank 1, another rank 1 will want to kill you for some unlikely reason. If you kill your nemesis or become a whole rank stronger than them, another will appear after a year’s delay. A nemesis will always be unusually strong for their rank.", negative: true },
                { id: 'luck-horizon', name: 'Horizon Graveyard Luck', cost: 200, description: "The luck of everyone around you falls slowly but surely, eventually dooming them. Your allies, family, and anyone who you spend time with will suffer.", negative: true },
                { id: 'luck-peach', name: 'Peach-blossom Luck', cost: -50, description: 'You will have very good luck with the opposite sex. They are more receptive to your advances and more prepared to help you. Less effective on those above your rank but still noticeable.' },
                { id: 'luck-platinum', name: 'Platinum Luck', cost: -100, description: 'You are more likely to stumble upon commercial opportunities, especially auctions. Buy low, sell high.' },
                { id: 'luck-dogshit', name: 'Dog Shit Luck', cost: -200, description: 'Your luck is greatly improved, as if by rank 6 Dog Shit Luck.' },
                { id: 'luck-fortune', name: 'Fortune Rivalling Heaven', cost: -400, description: "In addition to enjoying immense, Ma Hong Yun tier good fortune, you naturally have a greater understanding of luck and gain attainment in luck path 2x faster." }
            ]
        },

        soul: {
            type: 'multiple',
            title: 'Soul Foundation',
            description: "Buy each lower-level soul foundation to get a specific soul foundation, starting with the ten thousand man soul. Your body also gains the necessary Dao marks/alterations to contain such a powerful soul.",
            options: [
                { id: 'soul-10k', name: 'Ten Thousand Man Soul', cost: -50, description: "The soul foundation of a rank 5 expert. A clan leader of a super force, with all the resources that come with it, can expect to reach this soul foundation in 30 years, 20 if they use special or detrimental methods." },
                { id: 'soul-100k', name: 'Hundred Thousand Man Soul', cost: -100, description: "The soul foundation of a rank 6 immortal who has spent a great deal of effort strengthening their soul.", requires: ['soul-10k'] },
                { id: 'soul-1m', name: 'One Million Man Soul', cost: -100, description: "The soul foundation of a great expert of a path that benefits from soul foundation, like refinement path, wisdom path, enslavement path, etc. Any higher, and the Dao mark interference from your soul will become too great.", requires: ['soul-100k'] },
                { id: 'soul-10m', name: 'Ten Million Man Soul', cost: -100, description: "Only a soul path immortal would have a soul foundation this great. At this level, the interference from the soul path Dao marks on your soul would be detrimental to cultivating other paths. That is unless you have a way to get around this Dao mark interference. You naturally have a greater understanding of Soul and gain attainment in Soul path 2x faster.", requires: ['soul-1m'] }
            ]
        },

        venerable: {
            type: 'single',
            title: 'Venerable Inheritances',
            description: 'May only choose ONE venerable inheritance',
            options: [
                { id: 'ven-primordial', name: 'Primordial Origin', cost: -350, description: "Your base lifespan is increased by 10 times, and all life-extension methods are doubled in effectiveness. Lifespan drain does not affect you." },
                { id: 'ven-star', name: 'Star Constellation', cost: -500, description: "All your attainment gains are multiplied by 2. Additionally, all things that use mental energy require only half as much as they normally would." },
                { id: 'ven-limitless', name: 'Limitless', cost: -300, description: "You now gain 3 times as many Dao marks from any source as you otherwise would. Heaven's Will doesn't take into account the existence or effect of this perk when sending you tribulations as an immortal. This perk affects any Dao marks you may gain from any perks (This stacks with dao carver)." },
                { id: 'ven-reckless', name: 'Reckless Savage', cost: -400, description: "You may transfer your true meaning to others at will or take it with their ‘consent’. ‘Consent’ may be forced, you can take attainments from captured souls, albeit more slowly than from a conscious, ensouled prisoner. You only gain attainment if they have more than you." },
                { id: 'ven-genesis', name: 'Genesis Lotus', cost: -200, description: "You can store primeval and immortal essence in a ‘bank’ within your aperture. This makes mortal cultivation easier. Stored essence gains interest at 10% per annum, in the your aperture world’s time." },
                { id: 'ven-thieving', name: 'Thieving Heaven', cost: -400, description: "You gain a complete venerable inheritance. The established canon is disrupted as some random individual acquires Triple Qi Retraction, Star Constellation Chessboard, or Heaven and Earth Luck. Any Immortal Gu worms associated with these inheritances are at rank 6. Anticipate unpredictable consequences. If certain elements of the inheritance are unsuitable for a mortal aperture, they will be securely stored for future use when you attain an immortal aperture. If the immortal Gu worms linked to these inheritances already exist, they will be replaced with very similar Gu worms at Rank 6. Additionally, the inheritance will guide on using that Gu worm as a substitute." },
                { id: 'ven-redlotus', name: 'Red Lotus', cost: -250, description: "You get one save slot. Upon death or conscious activation, your will goes back in time to a point you designate. The save slot then disappears." },
                { id: 'ven-giant', name: 'Giant Sun', cost: -150, description: "You receive all options in the 'Luck' category for free.", grantsAllLuck: true },
                { id: 'ven-spectral', name: 'Spectral Soul', cost: -150, description: "Your will to win is unbreakable, and you can ignore all pain, despair, and negative emotions. Additionally, all soul path effects that reinforce, grow, or pacify your soul are two times more effective." },
                { id: 'ven-paradise', name: 'Paradise Earth', cost: -500, description: "You are born with 250 Dao Marks unrestrained heavenly Dao Marks, and your body is modified to withstand these Dao marks." },
                { id: 'ven-greatdream', name: 'Great Dream', cost: -200, description: "You may reach supreme grandmaster attainment via dream realms. 2x attainment gain in the dream path." },
                { id: 'ven-heavenrefine', name: 'Heaven Refining', cost: -500, description: "All your Dao marks are non-conflicting." }
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

        tier1: {
            type: 'multiple',
            title: 'Tier 1 Perks',
            description: 'Basic perks to start your cultivation journey',
            options: [
                { id: 'tier1-wealth', name: 'Primeval Wealth', cost: -50, description: "You acquire a rank 4 Primeval Elder Gu containing ten million primeval stones, equivalent to the wealth of a mid-sized clan. This option can be purchased multiple times.", repeatable: true },
                { id: 'tier1-guset', name: 'Gu Set', cost: -50, description: "You can choose 10 Gu worms of the same path from rank 1 to 5, and they will manifest in your aperture when selected. If the chosen Gu worm can be refined to a higher rank, you can instantly achieve that at no cost, with the limitation not exceeding rank 5. This perk can be acquired multiple times.", repeatable: true },
                { id: 'tier1-combat', name: 'Close Combat Master', cost: -50, description: "You are a battle genius and have mastered Krav Maga, Boxing, Brazilian Jiu-Jitsu, Grappling, and Muay Thai. Additionally, you possess master-level proficiency with a longsword, rapier, axe, and polearm." },
                { id: 'tier1-recipes', name: 'Mortal Recipes', cost: -50, description: "You can select any 10 mortal Gu worms and gain their rank 1 through rank 5 recipes. The recipes will use modern materials, ensuring availability. This perk is repeatable.", repeatable: true },
                { id: 'tier1-inhuman', name: 'Inhuman Transformations', cost: -50, description: "When transforming into a beastly form, you automatically gain the ability to move and control your body as if you were born in that form." },
                { id: 'tier1-flyinggm', name: 'Flying Grandmaster', cost: -50, description: "You attain grandmaster proficiency in flying. Even geniuses renowned for their flying skill, at most, achieve quasi-grandmaster flying attainment." },
                { id: 'tier1-longevity', name: 'Longevity', cost: -50, description: "You acquire a hundred-year lifespan Gu, which can be used to extend your lifespan or reserved for a different purpose." }
            ]
        },

        tier2: {
            type: 'multiple',
            title: 'Tier 2 Perks',
            description: 'Moderate perks for established cultivators',
            options: [
                { id: 'tier2-dualdao', name: 'Dual Dao', cost: -100, description: "You can choose two paths, and these paths do not interfere with each other when used. This costs 50 CP less if you are picking the two paths from Custom Extreme Physique.", conflicts: ['draw-daomono'] },
                { id: 'tier2-variantdao', name: 'Variant Dao', cost: -100, description: "If you are a variant human, you gain great grandmaster attainment in the path of your Dao. This means that dragon men gain great grandmaster in enslavement path, hairy men gain refinement path, etc. This doesn't count towards your great grandmaster attainment limit. You naturally have a greater understanding of the path associated with your race and gain attainment in that path 2x faster.", requires: ['race-variant'] },
                { id: 'tier2-secondap', name: 'Second Aperture', cost: -100, description: "You can awaken your second aperture at a time of your choosing. The second aperture functions as if created by rank 6 Second Aperture Gu, meaning it has no restriction on which rank it can rise to." },
                { id: 'tier2-superguset', name: 'Superior Gu Set', cost: -100, description: "You may pick 10 Gu worms, and they will appear in your aperture when you choose. If the Gu worm you have chosen can be refined to a higher rank, you can do so instantly at no cost when you wish, but not to a rank higher than 5. Furthermore, these 10 Gu worms do not need to be fed. You can buy this perk twice.", repeatable: true, maxCount: 2 },
                { id: 'tier2-immortalrecipes', name: 'Immortal Recipes', cost: -100, description: "You can choose 10 Gu worms, and you will obtain the rank 1 recipes, and the rank 2, etc., all the way to rank 9 for each Gu you choose. In other words, you will receive the recipe for the lowest possible rank that the Gu worm can be and up. The recipes will only contain materials that can all be found in the current era, with the higher-ranked recipes being a possible exception. They may contain very exotic or necessarily extinct, but still existing, materials." },
                { id: 'tier2-borndao', name: 'Born Dao', cost: -100, description: "You are born with 50 Dao Marks for a path of your choice. Your body is modified to withstand these Dao marks. You can only grab this once per Dao mark.", repeatable: true },
                { id: 'tier2-experience', name: 'Experience', cost: -100, description: "Before being born, you experience the entire life of a Random Gu master (Demontic, Righteous, lone, etc., your choice) who became immortal. The experience ends quickly after they die after reaching rank 6. If you are in the Alternative timeline, you can experience Fang Yuan’s first timeline from his point of view." },
                { id: 'tier2-growth', name: 'Growth', cost: -100, description: "Choose any path, and you gain 2x attainment growth in it. You can only grab this once per path.", repeatable: true },
                { id: 'tier2-greatlove', name: 'Great Love', cost: -100, description: "You become a grandmaster in social manipulation, reading people, manipulating agreements, and expressing false sincerity" }
            ]
        },

        tier3: {
            type: 'multiple',
            title: 'Tier 3 Perks',
            description: 'Advanced perks for experienced Gu masters',
            options: [
                { id: 'tier3-vitalgu', name: 'Vital Gu', cost: -150, description: "When you pass the immortal ascension, your vital Gu, along with 2 other Gu, are guaranteed to advance with you to rank 6. You can also further refine a rank 6 immortal Gu for each path you have great grandmaster attainment in." },
                { id: 'tier3-inheritance', name: 'Great Era Inheritance', cost: -150, description: "You gain a rank 6 immortal inheritance that guides you from rank 1 to the peak of rank 6. The inheritance will be 500 years ahead of its time and contain Gu recipes and killer moves that are centuries ahead of its time. You may choose the inheritance to be a path of the great era like weapon path, pill path, etc." },
                { id: 'tier3-reinforced', name: 'Reinforced Physique', cost: -150, description: "If you have an extreme physique, you suffer none of the downsides. Your ascension will be on the high end of what a normal immortal might experience, relatively tame compared to ten extreme physiques. After this Heaven's will isn't going to hold back." },
                { id: 'tier3-autobalance', name: 'Auto Balancer', cost: -150, description: "When undergoing immortal ascension, your Heaven, Earth, and Human Qi will automatically be balanced for you. It's guaranteed that you will pass immortal ascension." }
            ]
        },

        tier4: {
            type: 'multiple',
            title: 'Tier 4 Perks',
            description: 'Powerful perks for immortal cultivators',
            options: [
                { id: 'tier4-clone', name: 'Clone', cost: -250, description: "After awakening your aperture, you can create a clone of yourself at any time, you can choose if this clone shares your other perks and attainment levels.", conflicts: ['draw-indivisible'] },
                { id: 'tier4-servant', name: 'Servant of Heaven', cost: -250, description: "You are considered an ally of Heaven's Will and enjoy its favor. Fortuitous encounters are more likely, and your tribulations are easier to handle. This effect may intensify if you fight for Heavenly Court, target fate escapees, or confront enemies of heaven. Your heaven attainment increases at twice the normal speed. However, if you betray Heaven's Will (such as by attacking fate or defying heaven), you lose this power." },
                { id: 'tier4-hidden', name: 'Hidden Danger', cost: -200, description: "At will, you can suppress your aura down to nothing or pretend to be multiple ranks lower than you are. Similarly, killer moves won't reveal any aura if you choose to conceal it." },
                { id: 'tier4-lifedeath', name: 'Life and Death Aperture', cost: -200, description: "Upon immortal ascension, you gain a life and death aperture. This means you will experience tribulations at half the normal strength, but you still gain the same amount of Dao marks. With this perk, you are guaranteed to get a high-grade blessed land, unless you possess an extreme physique, in which case you will gain a super-grade blessed land as usual." },
                { id: 'tier4-daocarver', name: 'Dao Carver', cost: -300, description: "You now gain twice as many Dao marks from any source as you otherwise would. Heaven's Will doesn't take into account the existence or effect of this perk when sending you tribulations as an immortal. This perk affects any Dao marks you may gain from any perks. You now possess the cultivation prospects of a peak rank 8 expert or even a pseudo-venerable." },
                { id: 'tier4-antidiv', name: 'Anti-Divination', cost: -300, description: "You possess a rank 9 perpetual killer move, and you can choose the path it pertains to. Only a rank 9 wisdom path immortal equipped with a rank 9 Gu will have the ability to deduce information about you. Whenever someone attempts to make deductions about you, they either fail or receive an obfuscated answer. You have the flexibility to toggle this killer move on or off. If you wish for Heaven's Will to send you tribulations, you can disable the killer move." },
                { id: 'tier4-rank8inherit', name: 'Rank 8 Inheritance', cost: -250, description: "Rank 8 inheritance. You may choose one or two paths and gain a rank 8 inheritance of the path(s) you choose. You may not pick heaven path. If you bought 'Great Era Inheritance', this rank 8 inheritance may also be of a great era path along with the other features of 'Great era inheritance'. Regardless of if you bought 'Great era inheritance', you may pick two aspects that the inheritance specializes in. If you only choose for the inheritance to contain one path you may instead pick four: Offense, Defense, Movement, Investigation, Concealment, Healing and Aperture Management. If you choose two paths then the inheritance contain an excellent method to duel cultivate these two paths. The inheritance does not contain any Gu worms, however it contains the knowledge or how to refine, feed and use several immortal Gu. The inheritance also contains peak strength mortal killer moves that cover all aspects, and how to empower these killer moves to immortal level by using immortal materials. Of course, the inheritance also details these killer moves when used with apropiate immortal Gu. The inheritance also comes with a battlefield killer move, you may choose one specialization for the battlefield killer move : Activation speed, Killing power, Concealment, Suppression. With this inheritance you cultivation will be smooth sailing from beginning to end." },
                { id: 'tier4-pocket', name: 'Pocket Paradise', cost: -300, description: "You obtain an orb containing a blessed land, choosing the path for this land. The orb is portable and can be stored within your aperture. Upon activation outside the aperture, the orb becomes immobile. Once placed, the orb functions as a blessed land with a controlled land spirit. When not in use, you can deactivate the orb and return it to your aperture. The orb supplies the blessed land with heaven and earth Qi, allowing you to move it to any of the five regions without issues. The blessed land has an interior size of 7,000 m², and time moves 40 times faster than in the Gu world. It generates resources related to the chosen path of the blessed land. The blessed land is a paradise and remains free from tribulations. It has robust resource production, yielding 50 immortal essence stones annually, with ample room for further development." }
            ]
        },

        tier5: {
            type: 'multiple',
            title: 'Tier 5 Perks',
            description: 'Each additional Tier 5 perk after first costs +200 CP extra',
            options: [
                { id: 'tier5-dreamven', name: 'Small Dream Immortal Venerable', cost: -150, description: "You have master attainment in every path, providing uncanny and accurate intuitions about everything in the Gu world. You no longer have any restrictions on how many times you can buy grandmaster and great grandmaster attainment, and the price of buying attainment is halved.", removesAttainmentLimits: true },
                { id: 'tier5-maps', name: 'Gu Maps', cost: -200, description: "Gain a perfectly accurate map of the entire Gu world, stored in your head and projectable as a 3D hologram. The map includes detailed information on resource points, hidden inheritances, blessed lands, grotto-heavens, secluded domains, demographics, infrastructure, economic data, beast territory, and more. The map updates once a year." },
                { id: 'tier5-prodigy', name: 'Prodigy', cost: -200, description: "In a path of your choice, you now have great grandmaster attainment and gain 4x attainment growth in it, with the talent to reach supreme grandmaster without needing outside help. This does not count towards the limit of how many great grandmaster attainments you can buy." },
                { id: 'tier5-legendary', name: 'Legendary Expert', cost: -350, description: "You have quasi-supreme grandmaster attainment in a path of your choice, making you the undisputed expert in your path alive today. However, you will still need to exert a great deal of effort to raise your attainment to supreme grandmaster." },
                { id: 'tier5-vitalext', name: 'Vital Gu Extension', cost: -150, description: "Choose any Gu worm (except SAC). You acquire the capability to possess an additional Vital Gu worm. This Gu becomes your Vital Gu worm, accompanying your soul and manifesting when you first open your aperture at rank 1. It progressively advances in rank alongside you, reaching up to rank 9 automatically." },
                { id: 'tier5-pathfounder', name: 'Path Founder', cost: -200, description: "You may create your own path, starting off at master attainment with 2x attainment growth speed in it, along with potential for SGM. New paths are very hard to counter but won’t be quite so strong as dream path in terms of overall utility. The path should have an origin, two strengths and a weakness. For example, portal path would stem from space path (gaining somewhat from attainment in that path), be strong on speed and exploration but weak in aperture management." }
            ]
        },

        premiumGu: {
            type: 'multiple',
            title: 'Premium Gu Worms',
            description: "These are special Immortal Gu that have transcended the limit of gu world, it is as if they were the apex masterpiece of a venerable. Only venerables could make them from scratch, while great grandmaster attainment in their path is needed to advance them past rank 6. They won’t need to be fed for 30 years and can fit in mortal apertures. Upon choosing these worms you learn its recipe for rank 6 and may choose when these Gu worms appear in your aperture. You cannot choose these worms from any other perk.",
            options: [
                { id: 'premium-breakdream', name: 'Break Dream', cost: -150, description: "Dream Path: Destroys dream realms and counters dream path entities. Ideal for those who might face dream path moves, tribulations, or pesky enemies who hide in dream realms." },
                { id: 'premium-mastergu', name: 'Master of Gu', cost: -250, description: "Human Path: Contains the complete narrative of Reverend Insanity, including all unwritten chapters and side storys, When read it carves human path dao marks on the user, scaling with rank. It does not need immortal essence to use, only mental energy." },
                { id: 'premium-ptv', name: 'Path to Victory', cost: -350, description: "Wisdom Path: Allows you to create optimal step-by-step plans to fulfill goals, accounting even for factors the user is unaware of. Rank 6 can only account for Rank 6 entities and below. Uses a lot of mental energy and thoughts rather than immortal essence, making it useable for mortals (albeit only for smaller, short-term plans). You can use this like the light of wisdom to brute-force immortal gu recipes but this is extremely thought-intensive." },
                { id: 'premium-tribulation', name: 'Tribulation', cost: -250, description: "Heaven Path: Causes random tribulations against a target, whether it’s an immortal, object or beast. Using it often angers heaven’s will, eventually causing it to disfavour the user’s intent. Rank 6 causes earthly tribulations with a 5% chance of heavenly tribulations. Rank 7 causes heavenly tribulations with a 5% chance of grand tribulations… Target gains dao marks if it survives the tribulation." },
                { id: 'premium-chaos', name: 'Chaos Flame Gu', cost: -200, description: "Fire Path/Human Path (Consumable): Attaches a flame made out of Human path dao Marks to your soul. This flame can be summoned and manipulated, primarily as a weapon, instead of essence it uses mental and physical energy (but not lifespan). The strength of the flame depends on the strength of the body and soul. The flame, when not being physically manifested, can be used to nurture the body and soul and gradually strengthen them, and itself. This flame can be split off at effectively no cost and given to any willing individual, including mortals with no aptitude. When anyone uses the flame to strengthen themselves, a portion is fed back to the original user." },
                { id: 'premium-solvent', name: 'Universal Solvent Gu', cost: -200, description: "Water Path/Refinement Path: Creates a special type of refinement water. Any materials placed in the water will be stripped of dao marks until the water is saturated. These dao marks themselves are broken down into a soup of pseudo-marks. The water created by this Gu only affects materials of the gu rank or below. This saturated water can be used when refining as a replacement for any materials of equivalent dao marks." },
                { id: 'premium-selfoppression', name: 'Self Oppression Gu', cost: -150, description: "Enslavement Path: When used, anything enslaved under your control burdens its own soul with the cost of enslavement instead of you. You maintain control." },
                { id: 'premium-centraltime', name: 'Heaven\'s on Central Time', cost: -150, description: "Time Path (Consumable): When used in an immortal aperture, the time between tribulations is determined by central continent time instead of internal aperture time." },
                { id: 'premium-mobileform', name: 'Mobile Formation Immortal Gu', cost: -150, description: "Formation Path: When adding Mobile Formation Immortal Gu to the formation, it allows the user to move the formation freely." },
                { id: 'premium-innatestrength', name: 'Innate Strength Immortal Gu', cost: -150, description: "Strength Path/Transformation Path: Innate Strength Immortal Gu allows the user to have the innate strength of the creature he transforms into." },
                { id: 'premium-humanstrength', name: 'Human Strength Gu', cost: -100, description: "Human Path/Strength Path: A reusable Gu. Once a Gu Master uses the Human Strength Gu, the Gu Master gains the strength of 25 human men permanently" },
                { id: 'premium-partial', name: 'Partial Transformation Immortal Gu', cost: -150, description: "Transformation Path/Rule Path: Partial Transformation Immortal Gu allows combining the best features of the transformation of different creatures into one creature." },
                { id: 'premium-humanvessel', name: 'Human Vessel Gu', cost: -200, description: "Human Path: A reusable Gu. Once a Gu Master uses the Human Vessel Gu, the Gu Master will possess the ability to better withstand dao marks and experience reduced conflict between other dao marks." },
                { id: 'premium-danghun', name: 'Dang Hun Gu', cost: -200, description: "Soul Path: A reusable Gu. Upon use, this gu expends soul foundation to create Guts gu at a significantly worse rate than Dang Hun Mountain. Using this gu consumes soul foundation instead of Primeval Essence." }
            ]
        },

        missions: {
            type: 'multiple',
            title: 'Missions',
            description: "These are objectives that give you extra points, but you have to complete them within 300 years of central content time or you explode and die. Spectral Soul eats your soul, and Heaven's Will foils any revival methods. You cannot escape the consequence of not completing your missions. You may pick as many missions as you want.",
            options: [
                { id: 'mission-traditional', name: 'Traditional', cost: 100, description: "Create an inheritance and a suitable inheritance ground. Describe what the trials and requirements there are to get your inheritance." },
                { id: 'mission-paradise', name: 'Paradise', cost: 100, description: "Enter the Grotto-Heaven Blue Dragon Whale at least once." },
                { id: 'mission-kill', name: 'Problem? KILL!', cost: 150, description: "Destroy a super force. You don't have to kill all the members of that force, although it would be a good idea. You simply have to make it so that the super force doesn't exist anymore." },
                { id: 'mission-founding', name: 'Founding Ancestor', cost: 150, description: "Create a super force, it may be a clan, sect, or other. The force has to nurture at least one immortal besides yourself." },
                { id: 'mission-secluded', name: 'Secluded Domain', cost: 200, description: "Obtain a secluded domain of heaven and earth. You have to have had ownership of a secluded domain for a month for this mission to be considered successful." },
                { id: 'mission-supreme', name: 'Supreme Inheritance', cost: 200, description: "Obtain a complete true inheritance of any venerable. Thieving Heaven's three refinement opportunities from Lang Ya isn't a true inheritance (and Thieving Heaven Venerable Inheritance perk doesn't count either)." },
                { id: 'mission-homewrecker', name: 'Homewrecker', cost: 300, description: "Your mission is to destroy 88 True Yang building. If 88 True Yang building is destroyed without your direct involvement, you fail." },
                { id: 'mission-heavenly', name: 'Heavenly Court', cost: 600, description: "Join Heavenly Court and loyally serve its interests. You don't have to save Fate Gu; you might even think it preferable if Red Lotus' plan comes to fruition. But you have to do what you think is best for Heavenly Court." },
                { id: 'mission-david', name: 'David and Goliath', cost: 150, description: "As a mortal, defeat a cultivator 3 ranks above you, or defeat a rank 6 immortal, or as an immortal, defeat a Gu Immortal one rank above you." },
                { id: 'mission-feng', name: 'Eliminate Feng Jin Huang', cost: 100, description: "Your mission is to personally kill Feng Jin Huang. If Feng Jin Huang is killed without your direct involvement, you fail." },
                { id: 'mission-guardian', name: 'Eliminate Dao Guardian', cost: 100, description: "Your mission is to personally kill a Dao Guardian. If a Dao Guardian is killed without your direct involvement, you fail." }
            ]
        },

        drawbacks: {
            type: 'multiple',
            title: 'Drawbacks',
            description: "You may take as many drawbacks as you want. However, you may not take drawbacks more than once. Drawbacks overwrite other options picked in this character creator.",
            options: [
                { id: 'draw-nospoilers', name: 'No Spoilers', cost: 50, description: "You cannot share the contents of Reverend Insanity with anyone." },
                { id: 'draw-daomono', name: 'Dao Monogamous', cost: 100, description: "Other paths interfere twice as much with the path of your vital Gu as they normally would. If you have dual dao, you cannot pick this drawback.", conflicts: ['tier2-dualdao'] },
                { id: 'draw-unundead', name: 'Un-undead', cost: 100, description: "You cannot turn into a zombie. For good or ill, you cannot become a zombie. Lifespan is always in short supply, and you no longer have a fail-safe. You will have to pay the price to bask in the light of wisdom." },
                { id: 'draw-trueword', name: 'True to Your Word', cost: 100, description: "You can never break an alliance agreement. Dao marks related to any contract or alliance can never be forcefully removed. You will have to be very careful with what you sign up for and always insist on a time limit." },
                { id: 'draw-mistress', name: 'Like a Mistress', cost: 150, description: "Gu worms you own need three times as much food to be properly fed." },
                { id: 'draw-halflife', name: 'Halved Lifespan', cost: 200, description: "Your lifespan is halved, meaning if you are human, you only have 50 years to live. Lifespan extension methods are only half as effective as they normally would be." },
                { id: 'draw-daodunce', name: 'Dao Dunce', cost: 300, description: "You cannot increase your attainment level beyond what you buy in this character creator." },
                { id: 'draw-indivisible', name: 'Indivisible', cost: 300, description: "You cannot create clones. Others may not create clones of you either. You may still create external wills.", conflicts: ['tier4-clone'] },
                { id: 'draw-ofworld', name: 'Of This World', cost: 300, description: "For some reason, your soul and body are one of the Gu world, only your memories are of Earth, losing your otherworldly soul and Dao marks." },
                { id: 'draw-truthbound', name: 'Truthbound', cost: 250, description: "You cannot knowingly lie. Nor can you avoid answering a question; you suffer growing and eventually debilitating pain until you answer. You may be misleading and deceptive." },
                { id: 'draw-defy', name: 'Defy Reality', cost: 250, description: "You cannot knowingly tell the truth. If taken with Truthbound, you may never speak, write, or use gu worms to communicate in words, though there is no pain for lying. You’re stuck with pictures, expressions, and gestures." },
                { id: 'draw-cliche', name: 'Clichéd Daoist', cost: 100, description: "You run into a lot of xianxia literary conventions. Glance at a jade beauty? You better believe you’re courting death! Often these conventions will be subverted; you may find that the young master was only pretending to be a drooling moron, that his illogical feud with you is part of a master plan. Even so, ensure you’re ready for battle whenever you enter a restaurant." },
                { id: 'draw-fangyuan', name: 'Enemy - Fang Yuan', cost: 100, description: "Fang Yuan knows about your powers and exploits from his previous life and plans to exploit you in some way. He has the support of many venerables; you will run into complications if you attempt to raze Gu Yue clan before he is born, though it is not impossible to nip him in the bud if you’re brave enough. (You can only grab this drawback if your in the Second timeline)", requiresTimeline: 'timeline-second' },
                { id: 'draw-shadow', name: 'Enemy – Shadow Sect', cost: 200, description: "Shadow Sect will try to kill you. They’ll discover you only after you draw attention to yourself or become an immortal. Initially, they’ll work indirectly by having Zombie Alliance or Defy go after you, escalating if you prove unexpectedly powerful or compromise their plans." },
                { id: 'draw-heavenlycourt', name: 'Enemy – Heavenly Court', cost: 200, description: "After you become immortal, Heavenly Court will eventually conclude you are an enemy of heaven’s will. Their wisdom path great experts will eventually track you down and make well-calculated assassination attempts. As with Shadow Sect, HC has many other priorities and will only react quickly and aggressively if you draw a lot of attention to yourself." },
                { id: 'draw-principled', name: 'Principled Protagonist', cost: 250, description: "You can’t take demonic actions, from the point of view of both Gu World and Earth. For example, while the righteous path might try to enslave or exterminate variant humans, you may not even violate the Geneva Conventions. Sneak-attacking and so on are out too." },
                { id: 'draw-lone', name: 'Lone Cultivator', cost: 250, description: "You may never ally with anyone longer than 24 hours, either in combat or in cultivation. You can still live with your parents or find lovers as long as you don’t give or receive aid in the above." },
                { id: 'draw-filial', name: 'Filial Promise', cost: 300, description: "You may not attack a human or variant human with the intent to kill." }
            ]
        }
    },

    // Grab bag items - separate from categories
    grabBagItems: [
        { id: 'grab-reading', name: 'Reading Materials', description: "You have a popup window where you can read Reverend Insanity and the Reverend Insanity wiki; only you can read it." },
        { id: 'grab-professor', name: 'Gu Professor', description: "You always know if an immortal Gu exists or not." },
        { id: 'grab-polyglot', name: 'Polyglot', description: "You can speak and read the language of every region." },
        { id: 'grab-1ksoul', name: 'Thousand Man Soul', description: "You are born with a 1,000 man soul. With this soul foundation, you could control more than 100,000 beasts with enslavement path methods. As a Gu master, your soul is also strong enough to beat all but rank 5 experts in a battle between souls." },
        { id: 'grab-otherworld', name: 'Otherworldly Dao', description: "Choose what otherworldly Dao mark your soul comes with." },
        { id: 'grab-settra', name: 'Settra', description: "Slavery Gu, of any rank, does not work on you." },
        { id: 'grab-changewill', name: 'Change Will', description: "You can change an ideal of yourself to better fit the Gu world." },
        { id: 'grab-memories', name: 'Memories', description: "Before being born, you gain the memories of a mortal whole life that wasn’t involved with Gu Master's life." },
        { id: 'grab-instant', name: 'Instant Success', description: "Gu worms that carve Dao marks on the user, like Black Boar Gu, Iron Bone Gu, etc., will have their full effects shown immediately and painlessly upon use, and they won't need primeval essence to activate." },
        { id: 'grab-mutated', name: 'Mutated Soul', description: "You may choose for your soul to be a mutated soul. For example, if you choose to have a wolfman soul, your soul would have wolf characteristics and would be many times stronger when controlling wolves." },
        { id: 'grab-flying', name: 'Flying Master', description: "You now have master-level attainment in flying." },
        { id: 'grab-secret', name: 'Secret Manuals', description: "As shown by Red Lotus Demon Venerable's past, Gu cultivation isn't the only cultivation system to exist in this world. There are secret manuals that mortals who haven't or couldn't awaken their aperture can use to produce supernatural effects. However, such cultivation is very minor compared to Gu Cultivation. You gain 3 secret manuals of your choice." }
    ]
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