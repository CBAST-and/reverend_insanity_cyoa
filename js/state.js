// State Management Module
export const state = {
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
        clanStatus: null,
        specialBirth: null,
        aptitude: null,
        luck: [],
        soul: [],
        venerable: null,
        grabBagBundles: null,
        grabBagPerks: [],
        tier1: [],
        tier2: [],
        tier3: [],
        tier4: [],
        tier5: [],
        premiumGu: [],
        missions: [],
        drawbacks: [],
        attainments: []
    },
    
    // Track counts for repeatable items
    repeatCounts: {
        'tier1-wealth': 0,
        'tier1-guset': 0,
        'tier1-recipes': 0,
        'tier2-superguset': 0,
        'tier2-borndao': 0,
        'tier2-growth': 0
    },
    
    // Attainment tracking
    attainmentCounts: {
        grandmaster: 0,
        greatGrandmaster: 0
    },
    
    // Custom inputs
    customInputs: {
        immortalParents: ''
    },
    
    // Disabled sections
    disabledSections: []
};

// Get selection by category
export function getSelection(category) {
    return state.selections[category];
}

// Set selection for single-select category
export function setSelection(category, value) {
    state.selections[category] = value;
}

// Add selection for multi-select category
export function addSelection(category, value) {
    if (!state.selections[category].includes(value)) {
        state.selections[category].push(value);
    }
}

// Remove selection from multi-select category
export function removeSelection(category, value) {
    const index = state.selections[category].indexOf(value);
    if (index > -1) {
        state.selections[category].splice(index, 1);
    }
}

// Toggle selection for multi-select
export function toggleSelection(category, value) {
    if (state.selections[category].includes(value)) {
        removeSelection(category, value);
        return false;
    } else {
        addSelection(category, value);
        return true;
    }
}

// Check if option is selected
export function isSelected(category, optionId) {
    const selection = state.selections[category];
    if (Array.isArray(selection)) {
        return selection.includes(optionId);
    }
    return selection === optionId;
}

// Increment repeat count
export function incrementRepeat(optionId, subkey = null) {
    if (subkey) {
        // For path-specific repeats like borndao/growth
        if (!state.repeatCounts[optionId]) {
            state.repeatCounts[optionId] = {};
        }
        if (!state.repeatCounts[optionId][subkey]) {
            state.repeatCounts[optionId][subkey] = 0;
        }
        state.repeatCounts[optionId][subkey]++;
        return state.repeatCounts[optionId][subkey];
    } else {
        if (!state.repeatCounts[optionId]) {
            state.repeatCounts[optionId] = 0;
        }
        state.repeatCounts[optionId]++;
        return state.repeatCounts[optionId];
    }
}

// Decrement repeat count
export function decrementRepeat(optionId, subkey = null) {
    if (subkey) {
        if (state.repeatCounts[optionId] && state.repeatCounts[optionId][subkey]) {
            state.repeatCounts[optionId][subkey]--;
            if (state.repeatCounts[optionId][subkey] <= 0) {
                delete state.repeatCounts[optionId][subkey];
            }
        }
    } else {
        if (state.repeatCounts[optionId]) {
            state.repeatCounts[optionId]--;
            if (state.repeatCounts[optionId] <= 0) {
                state.repeatCounts[optionId] = 0;
            }
        }
    }
}

// Get repeat count
export function getRepeatCount(optionId, subkey = null) {
    if (subkey) {
        return state.repeatCounts[optionId]?.[subkey] || 0;
    }
    return state.repeatCounts[optionId] || 0;
}

// Reset state
export function resetState() {
    state.mode = null;
    state.startingPoints = 0;
    state.currentPoints = 0;
    
    Object.keys(state.selections).forEach(key => {
        if (Array.isArray(state.selections[key])) {
            state.selections[key] = [];
        } else {
            state.selections[key] = null;
        }
    });
    
    state.repeatCounts = {
        'tier1-wealth': 0,
        'tier1-guset': 0,
        'tier1-recipes': 0,
        'tier2-superguset': 0,
        'tier2-borndao': 0,
        'tier2-growth': 0
    };
    
    state.attainmentCounts = {
        grandmaster: 0,
        greatGrandmaster: 0
    };
    
    state.customInputs = {
        immortalParents: ''
    };
    
    state.disabledSections = [];
}

// Export state for import/export functionality
export function exportState() {
    return JSON.stringify(state, null, 2);
}

// Import state
export function importState(jsonString) {
    try {
        const imported = JSON.parse(jsonString);
        Object.assign(state, imported);
        return true;
    } catch (error) {
        console.error('Failed to import state:', error);
        return false;
    }
}

// Disable sections
export function disableSections(sections) {
    state.disabledSections = [...new Set([...state.disabledSections, ...sections])];
}

// Enable sections
export function enableSections(sections) {
    state.disabledSections = state.disabledSections.filter(s => !sections.includes(s));
}

// Check if section is disabled
export function isSectionDisabled(section) {
    return state.disabledSections.includes(section);
}

// Clear disabled sections
export function clearDisabledSections() {
    state.disabledSections = [];
}