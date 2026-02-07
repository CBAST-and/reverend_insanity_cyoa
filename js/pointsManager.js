// Points Manager - Handles all point calculations
// RULE: Positive costs GIVE points, Negative costs TAKE points

import { state, getRepeatCount } from './state.js';
import { CYOA_DATA, ATTAINMENT_COSTS } from './data.js';

// Apply cost to current points
// Positive cost = gives you points (adds to total)
// Negative cost = costs you points (subtracts from total)
export function applyCost(cost) {
    state.currentPoints += cost;
}

// Reverse cost (when deselecting)
export function reverseCost(cost) {
    state.currentPoints -= cost;
}

// Calculate total cost for a repeatable item
export function getRepeatableCost(optionId, count) {
    const result = CYOA_DATA.categories;
    let baseCost = 0;
    
    // Find the option
    for (const categoryKey in result) {
        const category = result[categoryKey];
        if (category.options) {
            const option = category.options.find(opt => opt.id === optionId);
            if (option) {
                baseCost = option.cost;
                break;
            }
        }
    }
    
    return baseCost * count;
}

// Calculate tier 5 surcharge
// First tier 5 perk: normal cost
// Each additional: +200 CP surcharge
export function getTier5Cost(baseCost, isFirstTier5) {
    if (isFirstTier5) {
        return baseCost;
    }
    
    const tier5Count = state.selections.tier5.length;
    const surcharge = tier5Count * 200;
    
    // Base cost is negative (costs points), surcharge makes it cost MORE
    // So we subtract the surcharge (making the cost more negative)
    return baseCost - surcharge;
}

// Calculate attainment cost with Small Dream discount
export function getAttainmentCost(level) {
    const baseCost = ATTAINMENT_COSTS[level];
    
    // Check if Small Dream is selected (halves attainment costs)
    const hasSmallDream = state.selections.tier5.includes('tier5-dreamven');
    
    if (hasSmallDream) {
        return Math.floor(baseCost / 2);
    }
    
    return baseCost;
}

// Update points display
export function updatePointsDisplay() {
    const currentEl = document.getElementById('current-points');
    const startingEl = document.getElementById('starting-points');
    
    if (!currentEl || !startingEl) return;
    
    currentEl.textContent = state.currentPoints.toLocaleString();
    startingEl.textContent = state.startingPoints.toLocaleString();
    
    // Color coding
    currentEl.classList.remove('positive', 'negative');
    if (state.currentPoints < 0) {
        currentEl.classList.add('negative');
    } else if (state.currentPoints > state.startingPoints) {
        currentEl.classList.add('positive');
    }
}

// Calculate points from Giant Sun venerable
// Giant Sun gives all luck options for free
export function applyGiantSunBonus() {
    if (!state.selections.venerable === 'ven-giant') return 0;
    
    let totalRefund = 0;
    
    // Get all luck options
    const luckCategory = CYOA_DATA.categories.luck;
    if (luckCategory && luckCategory.options) {
        luckCategory.options.forEach(option => {
            // Only refund negative costs (options that cost points)
            if (option.cost < 0) {
                totalRefund -= option.cost; // Subtract negative = add positive
            }
        });
    }
    
    return totalRefund;
}

// Check if attainment limits are removed
export function areAttainmentLimitsRemoved() {
    return state.selections.tier5.includes('tier5-dreamven');
}

// Validate point spend (for export/summary)
export function validateBuild() {
    const errors = [];
    
    // Check if over budget
    if (state.currentPoints < 0) {
        errors.push(`Over budget by ${Math.abs(state.currentPoints)} CP`);
    }
    
    // Check attainment limits (if not removed)
    if (!areAttainmentLimitsRemoved()) {
        if (state.attainmentCounts.grandmaster > 4) {
            errors.push('Too many Grandmaster attainments (max 4)');
        }
        if (state.attainmentCounts.greatGrandmaster > 2) {
            errors.push('Too many Great Grandmaster attainments (max 2)');
        }
    }
    
    // Check Superior Gu Set limit
    if (getRepeatCount('tier2-superguset') > 2) {
        errors.push('Too many Superior Gu Sets (max 2)');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Recalculate all points from scratch (for import/refresh)
export function recalculateAllPoints() {
    state.currentPoints = state.startingPoints;
    
    // Apply all selections
    for (const category in state.selections) {
        const selection = state.selections[category];
        
        if (Array.isArray(selection)) {
            // Multiple selections
            selection.forEach(optionId => {
                const cost = getOptionCost(optionId);
                if (cost !== null) {
                    applyCost(cost);
                }
            });
        } else if (selection) {
            // Single selection
            const cost = getOptionCost(selection);
            if (cost !== null) {
                applyCost(cost);
            }
        }
    }
    
    // Apply attainment costs
    state.selections.attainments.forEach(att => {
        const cost = getAttainmentCost(att.level);
        applyCost(-cost); // Attainments cost points (negative)
    });
    
    // Apply repeatable costs
    for (const optionId in state.repeatCounts) {
        if (typeof state.repeatCounts[optionId] === 'number') {
            const count = state.repeatCounts[optionId];
            if (count > 0) {
                const cost = getRepeatableCost(optionId, count);
                applyCost(cost);
            }
        }
    }
    
    updatePointsDisplay();
}

// Get cost for an option by ID
function getOptionCost(optionId) {
    for (const categoryKey in CYOA_DATA.categories) {
        const category = CYOA_DATA.categories[categoryKey];
        if (category.options) {
            const option = category.options.find(opt => opt.id === optionId);
            if (option) {
                return option.cost;
            }
        }
        
        // Check sub-options (like clan status)
        if (category.hasSubOptions) {
            for (const opt of category.options) {
                if (opt.statusOptions) {
                    const subOpt = opt.statusOptions.find(s => s.id === optionId);
                    if (subOpt) {
                        return subOpt.cost;
                    }
                }
            }
        }
    }
    
    // Check grab bag items (they don't have individual costs)
    if (CYOA_DATA.categories.grabBagItems) {
        const item = CYOA_DATA.categories.grabBagItems.find(i => i.id === optionId);
        if (item) return 0; // Grab bag items are "free", cost is in the bundle
    }
    
    return null;
}