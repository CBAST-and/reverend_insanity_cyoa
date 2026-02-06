// State management
const state = {
    mode: null,
    startingPoints: 0,
    currentPoints: 0,
    selections: {
        timeline: null,
        prep: null,
        race: null,
        sex: null,
        appearance: null,
        specialTraits: [],
        clanTier: null,
        status: null,
        specialBirth: null,
        aptitude: null,
        luck: [],
        soul: [],
        attainments: [],
        grabBagBundle: null,
        grabBagPerks: [],
        tier1: [],
        tier2: [],
        tier3: [],
        tier4: [],
        tier5: [],
        venerable: null,
        premiumGu: [],
        missions: [],
        drawbacks: []
    },
    counts: {
        tier1Wealth: 0,
        tier1GuSet: 0,
        tier1Recipes: 0,
        tier2SuperiorGuSet: 0,
        tier2BornDao: {},
        tier2Growth: {},
        grandmasterCount: 0,
        greatGrandmasterCount: 0,
        tier5Count: 0
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupModeSelection();
    setupEventListeners();
});

// Mode Selection
function setupModeSelection() {
    const modeCards = document.querySelectorAll('.mode-card');
    
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            const points = parseInt(card.dataset.points);
            
            // Remove previous selection
            modeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            // Set state
            state.mode = mode;
            state.startingPoints = points;
            state.currentPoints = points;
            
            // Show CYOA content
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('points-display').style.display = 'flex';
            document.getElementById('cyoa-content').style.display = 'block';
            
            updatePointsDisplay();
        });
    });
}

// Event Listeners
function setupEventListeners() {
    // Single selection categories
    document.querySelectorAll('[data-type="single"]').forEach(grid => {
        const category = grid.dataset.category;
        
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.option-card');
            if (!card || card.classList.contains('disabled')) return;
            
            // Handle special cases
            if (category === 'timeline' && card.dataset.id === 'timeline-alternative') {
                // Alternative timeline skips race, location, appearance AND prep time
                disableCategories(['race', 'sex', 'appearance', 'clan-tier', 'status']);
                disableSection('prep');
            } else if (category === 'timeline' && state.selections.timeline === 'timeline-alternative') {
                // Re-enable if switching from alternative
                enableCategories(['race', 'sex', 'appearance', 'clan-tier', 'status']);
                enableSection('prep');
            }
            
            selectSingleOption(grid, card, category);
        });
    });
    
    // Multiple selection categories
    document.querySelectorAll('[data-type="multiple"]').forEach(grid => {
        const category = grid.dataset.category;
        
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.option-card');
            if (!card || card.classList.contains('disabled')) return;
            
            toggleMultipleOption(card, category);
        });
    });
    
    // Clan tier change updates status options
    document.querySelector('[data-category="clan-tier"]')?.addEventListener('click', updateStatusOptions);
    
    // Attainment builder
    setupAttainmentBuilder();
    
    // Grab bag
    setupGrabBag();
    
    // Export/Import/Reset
    document.getElementById('export-btn').addEventListener('click', exportBuild);
    document.getElementById('import-btn').addEventListener('click', importBuild);
    document.getElementById('reset-btn').addEventListener('click', resetBuild);
}

// Single selection handler
function selectSingleOption(grid, card, category) {
    const previousCard = grid.querySelector('.option-card.selected');
    const previousCost = previousCard ? parseInt(previousCard.dataset.cost) : 0;
    const newCost = parseInt(card.dataset.cost);
    
    // Remove previous selection
    if (previousCard) {
        previousCard.classList.remove('selected');
    }
    
    // Add new selection
    card.classList.add('selected');
    
    // Update state
    state.selections[category] = card.dataset.id;
    
    // Update points (positive cost gives points, negative cost takes points)
    // When switching: remove previous cost effect, apply new cost effect
    state.currentPoints = state.currentPoints - previousCost + newCost;
    updatePointsDisplay();
    updateSummary();
}

// Multiple selection handler
function toggleMultipleOption(card, category) {
    const id = card.dataset.id;
    const cost = parseInt(card.dataset.cost);
    const isSelected = card.classList.contains('selected');
    
    // Check for special restrictions
    if (!isSelected) {
        // Check Tier 5 limit
        if (category === 'tier5') {
            const tier5Count = state.selections.tier5.length;
            if (tier5Count > 0) {
                // Each additional tier 5 costs 200 more
                const additionalCost = 200 * tier5Count;
                if (!confirm(`This is your ${tier5Count + 1}${getOrdinalSuffix(tier5Count + 1)} Tier 5 perk. It will cost an additional ${additionalCost} CP. Continue?`)) {
                    return;
                }
                state.currentPoints -= additionalCost;
            }
        }
        
        // Check Superior Gu Set limit (max 2)
        if (id === 'tier2-superguset' && state.counts.tier2SuperiorGuSet >= 2) {
            alert('You can only purchase Superior Gu Set twice.');
            return;
        }
        
        // Check Dual Dao conflicts
        if (id === 'tier2-dualdao' && state.selections.drawbacks.includes('draw-daomono')) {
            alert('Cannot take Dual Dao with Dao Monogamous drawback.');
            return;
        }
        if (id === 'draw-daomono' && state.selections.tier2.includes('tier2-dualdao')) {
            alert('Cannot take Dao Monogamous with Dual Dao.');
            return;
        }
        
        // Check Variant Dao requirement
        if (id === 'tier2-variantdao' && state.selections.race !== 'race-variant') {
            alert('Variant Dao requires variant human race.');
            return;
        }
        
        // Check Reinforced Physique requirement
        if (id === 'tier3-reinforced' && !['apt-extreme', 'apt-custom'].includes(state.selections.aptitude)) {
            alert('Reinforced Physique requires an extreme physique.');
            return;
        }
        
        // Check Enemy - Fang Yuan timeline restriction
        if (id === 'draw-fangyuan' && state.selections.timeline !== 'timeline-second') {
            alert('Enemy - Fang Yuan can only be chosen in Second Timeline.');
            return;
        }
    }
    
    // Toggle selection
    if (isSelected) {
        card.classList.remove('selected');
        
        // Remove from state
        const index = state.selections[category].indexOf(id);
        if (index > -1) {
            state.selections[category].splice(index, 1);
        }
        
        // Handle special counts
        if (id.includes('wealth')) state.counts.tier1Wealth--;
        if (id.includes('guset') && category === 'tier1') state.counts.tier1GuSet--;
        if (id.includes('recipes')) state.counts.tier1Recipes--;
        if (id === 'tier2-superguset') state.counts.tier2SuperiorGuSet--;
        
        // Refund points (reverse the cost effect)
        state.currentPoints -= cost;
        
        // Handle Tier 5 refunds
        if (category === 'tier5') {
            const tier5Index = state.selections.tier5.indexOf(id);
            if (tier5Index > 0) {
                state.currentPoints -= 200 * tier5Index;
            }
        }
    } else {
        card.classList.add('selected');
        
        // Add to state
        state.selections[category].push(id);
        
        // Handle special counts
        if (id.includes('wealth')) state.counts.tier1Wealth++;
        if (id.includes('guset') && category === 'tier1') state.counts.tier1GuSet++;
        if (id.includes('recipes')) state.counts.tier1Recipes++;
        if (id === 'tier2-superguset') state.counts.tier2SuperiorGuSet++;
        
        // Apply points (positive cost gives points, negative cost takes points)
        state.currentPoints += cost;
    }
    
    updatePointsDisplay();
    updateSummary();
}

// Status options based on clan tier
function updateStatusOptions() {
    const clanTier = state.selections.clanTier;
    const statusGrid = document.getElementById('status-options');
    
    if (!clanTier) {
        statusGrid.innerHTML = '<p class="info-text">Select a clan tier first</p>';
        return;
    }
    
    statusGrid.innerHTML = '';
    
    const statusOptions = {
        'clan-mortal': [
            { id: 'status-mortal-heir', name: 'Rank 2 Heir', cost: 50 }
        ],
        'clan-mid': [
            { id: 'status-mid-r2', name: 'Rank 2 Heir', cost: 50 },
            { id: 'status-mid-elder', name: 'Heir of Elder', cost: 0 },
            { id: 'status-mid-leader', name: 'Heir of Clan Leader', cost: -50 }
        ],
        'clan-high': [
            { id: 'status-high-random', name: 'Random', cost: 50 },
            { id: 'status-high-r2', name: 'Rank 2 Heir', cost: 0 },
            { id: 'status-high-elder', name: 'Heir of Elder', cost: -50 },
            { id: 'status-high-leader', name: 'Heir of Clan Leader', cost: -100 }
        ],
        'clan-super': [
            { id: 'status-super-random', name: 'Random', cost: 50 },
            { id: 'status-super-r2', name: 'Rank 2 Heir', cost: 0 },
            { id: 'status-super-elder', name: 'Heir of Elder', cost: -50 },
            { id: 'status-super-r5', name: 'Heir of Rank 5', cost: -100 },
            { id: 'status-super-immortal', name: 'Child of Immortal', cost: -250 }
        ]
    };
    
    const options = statusOptions[clanTier] || [];
    
    options.forEach(option => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.dataset.id = option.id;
        card.dataset.cost = option.cost;
        
        const costColor = option.cost > 0 ? 'positive' : option.cost < 0 ? 'negative' : 'muted';
        const costSign = option.cost > 0 ? '+' : '';
        
        card.innerHTML = `
            <h3>${option.name}</h3>
            <p class="cost">${costSign}${option.cost} CP</p>
        `;
        
        statusGrid.appendChild(card);
    });
}

// Attainment Builder
function setupAttainmentBuilder() {
    const pathSelect = document.getElementById('attainment-path-select');
    const masterBtn = document.getElementById('add-master-btn');
    const grandmasterBtn = document.getElementById('add-grandmaster-btn');
    const greatGMBtn = document.getElementById('add-greatgm-btn');
    
    masterBtn.addEventListener('click', () => addAttainment('master'));
    grandmasterBtn.addEventListener('click', () => addAttainment('grandmaster'));
    greatGMBtn.addEventListener('click', () => addAttainment('greatgrandmaster'));
}

function addAttainment(level) {
    const pathSelect = document.getElementById('attainment-path-select');
    const path = pathSelect.value;
    
    if (!path) {
        alert('Please select a path first.');
        return;
    }
    
    // Check if path already has this level or higher
    const existing = state.selections.attainments.find(a => a.path === path);
    if (existing) {
        const levels = ['master', 'grandmaster', 'greatgrandmaster'];
        const existingIndex = levels.indexOf(existing.level);
        const newIndex = levels.indexOf(level);
        
        if (newIndex <= existingIndex) {
            alert(`This path already has ${existing.level} attainment or higher.`);
            return;
        }
        
        // Upgrade existing
        const costDiff = getAttainmentCost(level) - getAttainmentCost(existing.level);
        
        // Check limits
        if (level === 'grandmaster' && state.counts.grandmasterCount >= 4 && existing.level !== 'grandmaster') {
            alert('Maximum 4 grandmaster attainments allowed.');
            return;
        }
        if (level === 'greatgrandmaster' && state.counts.greatGrandmasterCount >= 2 && existing.level !== 'greatgrandmaster') {
            alert('Maximum 2 great grandmaster attainments allowed.');
            return;
        }
        
        // Update counts
        if (existing.level === 'grandmaster') state.counts.grandmasterCount--;
        if (existing.level === 'greatgrandmaster') state.counts.greatGrandmasterCount--;
        if (level === 'grandmaster') state.counts.grandmasterCount++;
        if (level === 'greatgrandmaster') state.counts.greatGrandmasterCount++;
        
        existing.level = level;
        // Apply discount, then apply as negative (cost)
        const discount = state.selections.tier5.includes('tier5-dreamven') ? 0.5 : 1;
        const finalCostDiff = Math.floor(costDiff * discount);
        state.currentPoints -= finalCostDiff;
    } else {
        // Check limits
        if (level === 'grandmaster' && state.counts.grandmasterCount >= 4) {
            alert('Maximum 4 grandmaster attainments allowed.');
            return;
        }
        if (level === 'greatgrandmaster' && state.counts.greatGrandmasterCount >= 2) {
            alert('Maximum 2 great grandmaster attainments allowed.');
            return;
        }
        
        // Add new
        const cost = getAttainmentCost(level);
        
        // Apply Small Dream discount if applicable
        const discount = state.selections.tier5.includes('tier5-dreamven') ? 0.5 : 1;
        const finalCost = Math.floor(cost * discount);
        
        state.selections.attainments.push({ path, level });
        // Attainments cost points (negative cost in data-cost terms)
        state.currentPoints -= finalCost;
        
        // Update counts
        if (level === 'grandmaster') state.counts.grandmasterCount++;
        if (level === 'greatgrandmaster') state.counts.greatGrandmasterCount++;
    }
    
    renderAttainmentList();
    updatePointsDisplay();
    updateSummary();
}

function getAttainmentCost(level) {
    const costs = {
        master: 50,
        grandmaster: 100,
        greatgrandmaster: 200
    };
    return costs[level] || 0;
}

function renderAttainmentList() {
    const list = document.getElementById('attainment-list');
    
    if (state.selections.attainments.length === 0) {
        list.innerHTML = '<p class="info-text">No attainments selected yet</p>';
        return;
    }
    
    list.innerHTML = '';
    
    state.selections.attainments.forEach((att, index) => {
        const item = document.createElement('div');
        item.className = 'attainment-item';
        
        const levelName = att.level.replace('grandmaster', 'GM').replace('great', 'Great ');
        
        item.innerHTML = `
            <div class="attainment-item-info">
                <div class="attainment-item-path">${capitalizeFirst(att.path)} Path</div>
                <div class="attainment-item-level">${capitalizeFirst(levelName)}</div>
            </div>
            <button class="attainment-item-remove" data-index="${index}">Remove</button>
        `;
        
        list.appendChild(item);
    });
    
    // Add remove listeners
    list.querySelectorAll('.attainment-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            removeAttainment(index);
        });
    });
}

function removeAttainment(index) {
    const att = state.selections.attainments[index];
    const cost = getAttainmentCost(att.level);
    
    // Apply Small Dream discount if applicable
    const discount = state.selections.tier5.includes('tier5-dreamven') ? 0.5 : 1;
    const finalCost = Math.floor(cost * discount);
    
    // Update counts
    if (att.level === 'grandmaster') state.counts.grandmasterCount--;
    if (att.level === 'greatgrandmaster') state.counts.greatGrandmasterCount--;
    
    state.selections.attainments.splice(index, 1);
    // Refund points - attainment costs are negative, so removing them gives points back
    state.currentPoints -= -finalCost; // Same as += finalCost
    
    renderAttainmentList();
    updatePointsDisplay();
    updateSummary();
}

// Grab Bag
function setupGrabBag() {
    const bundleGrid = document.querySelector('[data-category="grab-bag-bundle"]');
    
    bundleGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.option-card');
        if (!card) return;
        
        const previousCard = bundleGrid.querySelector('.option-card.selected');
        if (previousCard) {
            previousCard.classList.remove('selected');
        }
        
        card.classList.add('selected');
        
        const id = card.dataset.id;
        const maxPerks = parseInt(id.split('-')[1]);
        
        state.selections.grabBagBundle = id;
        
        // Update points (grab bag bundles cost points - negative values)
        const previousCost = previousCard ? parseInt(previousCard.dataset.cost) : 0;
        const newCost = parseInt(card.dataset.cost);
        state.currentPoints = state.currentPoints - previousCost + newCost;
        
        // Show selection interface
        document.getElementById('grab-bag-selection').style.display = 'block';
        document.getElementById('grab-max').textContent = maxPerks;
        document.getElementById('grab-selected').textContent = '0';
        
        // Reset selections
        state.selections.grabBagPerks = [];
        document.querySelectorAll('.grab-item').forEach(item => {
            item.classList.remove('selected', 'disabled');
        });
        
        updatePointsDisplay();
        updateSummary();
    });
    
    // Grab bag item selection
    const grabGrid = document.querySelector('.grab-bag-grid');
    grabGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.grab-item');
        if (!item || item.classList.contains('disabled')) return;
        
        if (!state.selections.grabBagBundle) {
            alert('Please select a grab bag bundle first.');
            return;
        }
        
        const maxPerks = parseInt(state.selections.grabBagBundle.split('-')[1]);
        const id = item.dataset.id;
        const isSelected = item.classList.contains('selected');
        
        if (isSelected) {
            item.classList.remove('selected');
            const index = state.selections.grabBagPerks.indexOf(id);
            if (index > -1) {
                state.selections.grabBagPerks.splice(index, 1);
            }
        } else {
            if (state.selections.grabBagPerks.length >= maxPerks) {
                alert(`You can only select ${maxPerks} perks.`);
                return;
            }
            
            item.classList.add('selected');
            state.selections.grabBagPerks.push(id);
        }
        
        document.getElementById('grab-selected').textContent = state.selections.grabBagPerks.length;
        
        // Disable other items if at max
        if (state.selections.grabBagPerks.length >= maxPerks) {
            document.querySelectorAll('.grab-item:not(.selected)').forEach(i => {
                i.classList.add('disabled');
            });
        } else {
            document.querySelectorAll('.grab-item').forEach(i => {
                i.classList.remove('disabled');
            });
        }
        
        updateSummary();
    });
}

// Points Display
function updatePointsDisplay() {
    const currentEl = document.getElementById('current-points');
    const startingEl = document.getElementById('starting-points');
    
    currentEl.textContent = state.currentPoints;
    startingEl.textContent = state.startingPoints;
    
    // Color coding
    currentEl.classList.remove('positive', 'negative');
    if (state.currentPoints < 0) {
        currentEl.classList.add('negative');
    } else if (state.currentPoints > 0) {
        currentEl.classList.add('positive');
    }
}

// Summary
function updateSummary() {
    const summaryContent = document.getElementById('summary-content');
    const categories = [
        { key: 'timeline', label: 'Timeline' },
        { key: 'race', label: 'Race' },
        { key: 'aptitude', label: 'Aptitude' },
        { key: 'attainments', label: 'Attainments', special: true },
        { key: 'luck', label: 'Luck', multiple: true },
        { key: 'soul', label: 'Soul Foundation', multiple: true },
        { key: 'tier1', label: 'Tier 1 Perks', multiple: true },
        { key: 'tier2', label: 'Tier 2 Perks', multiple: true },
        { key: 'tier3', label: 'Tier 3 Perks', multiple: true },
        { key: 'tier4', label: 'Tier 4 Perks', multiple: true },
        { key: 'tier5', label: 'Tier 5 Perks', multiple: true },
        { key: 'venerable', label: 'Venerable Inheritance' },
        { key: 'premiumGu', label: 'Premium Gu Worms', multiple: true },
        { key: 'grabBagPerks', label: 'Grab Bag Perks', special: true },
        { key: 'missions', label: 'Missions', multiple: true },
        { key: 'drawbacks', label: 'Drawbacks', multiple: true }
    ];
    
    let html = '';
    
    categories.forEach(cat => {
        const selections = state.selections[cat.key];
        
        if (cat.special && cat.key === 'attainments') {
            if (selections && selections.length > 0) {
                html += `<div class="summary-category"><h3>${cat.label}</h3><ul>`;
                selections.forEach(att => {
                    html += `<li><span class="summary-item-name">${capitalizeFirst(att.path)} - ${capitalizeFirst(att.level)}</span></li>`;
                });
                html += '</ul></div>';
            }
        } else if (cat.special && cat.key === 'grabBagPerks') {
            if (selections && selections.length > 0) {
                html += `<div class="summary-category"><h3>${cat.label}</h3><ul>`;
                selections.forEach(id => {
                    const name = getGrabBagName(id);
                    html += `<li><span class="summary-item-name">${name}</span></li>`;
                });
                html += '</ul></div>';
            }
        } else if (cat.multiple) {
            if (selections && selections.length > 0) {
                html += `<div class="summary-category"><h3>${cat.label}</h3><ul>`;
                selections.forEach(id => {
                    const option = findOptionById(id);
                    if (option) {
                        const costClass = option.cost > 0 ? 'positive' : option.cost < 0 ? 'negative' : '';
                        html += `<li><span class="summary-item-name">${option.name}</span><span class="summary-item-cost ${costClass}">${option.cost > 0 ? '+' : ''}${option.cost} CP</span></li>`;
                    }
                });
                html += '</ul></div>';
            }
        } else {
            if (selections) {
                const option = findOptionById(selections);
                if (option) {
                    const costClass = option.cost > 0 ? 'positive' : option.cost < 0 ? 'negative' : '';
                    html += `<div class="summary-category"><h3>${cat.label}</h3><ul>`;
                    html += `<li><span class="summary-item-name">${option.name}</span><span class="summary-item-cost ${costClass}">${option.cost > 0 ? '+' : ''}${option.cost} CP</span></li>`;
                    html += '</ul></div>';
                }
            }
        }
    });
    
    if (html === '') {
        html = '<p class="info-text">No selections yet. Start building your character!</p>';
    }
    
    summaryContent.innerHTML = html;
}

// Find option by ID
function findOptionById(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (!card) return null;
    
    const name = card.querySelector('h3')?.textContent || '';
    const cost = parseInt(card.dataset.cost) || 0;
    
    return { name, cost };
}

// Get grab bag name
function getGrabBagName(id) {
    const names = {
        'grab-reading': 'Reading Materials',
        'grab-professor': 'Gu Professor',
        'grab-polyglot': 'Polyglot',
        'grab-1ksoul': 'Thousand Man Soul',
        'grab-otherworld': 'Otherworldly Dao',
        'grab-settra': 'Settra',
        'grab-changewill': 'Change Will',
        'grab-memories': 'Memories',
        'grab-instant': 'Instant Success',
        'grab-mutated': 'Mutated Soul',
        'grab-flying': 'Flying Master',
        'grab-secret': 'Secret Manuals'
    };
    return names[id] || id;
}

// Export Build
function exportBuild() {
    const build = {
        mode: state.mode,
        startingPoints: state.startingPoints,
        currentPoints: state.currentPoints,
        selections: state.selections,
        counts: state.counts
    };
    
    const json = JSON.stringify(build, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reverend-insanity-build.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Import Build
function importBuild() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const build = JSON.parse(event.target.result);
                
                // Validate
                if (!build.mode || !build.selections) {
                    alert('Invalid build file.');
                    return;
                }
                
                // Apply build
                Object.assign(state, build);
                
                // Update UI
                location.reload(); // Simple reload to reset all UI
                
            } catch (error) {
                alert('Error loading build: ' + error.message);
            }
        };
        reader.readAsText(file);
    });
    
    input.click();
}

// Reset Build
function resetBuild() {
    if (!confirm('Are you sure you want to reset all selections? This cannot be undone.')) {
        return;
    }
    
    location.reload();
}

// Helper Functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

function disableCategories(categories) {
    categories.forEach(cat => {
        const grid = document.querySelector(`[data-category="${cat}"]`);
        if (grid) {
            grid.querySelectorAll('.option-card').forEach(card => {
                card.classList.add('disabled');
            });
        }
    });
}

function enableCategories(categories) {
    categories.forEach(cat => {
        const grid = document.querySelector(`[data-category="${cat}"]`);
        if (grid) {
            grid.querySelectorAll('.option-card').forEach(card => {
                card.classList.remove('disabled');
            });
        }
    });
}

function disableSection(category) {
    const grid = document.querySelector(`[data-category="${category}"]`);
    if (grid) {
        grid.querySelectorAll('.option-card').forEach(card => {
            card.classList.add('disabled');
        });
        // Also visually indicate section is disabled
        const section = grid.closest('.category');
        if (section) {
            section.style.opacity = '0.5';
            section.style.pointerEvents = 'none';
        }
    }
}

function enableSection(category) {
    const grid = document.querySelector(`[data-category="${category}"]`);
    if (grid) {
        grid.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('disabled');
        });
        // Re-enable section
        const section = grid.closest('.category');
        if (section) {
            section.style.opacity = '1';
            section.style.pointerEvents = 'auto';
        }
    }
}