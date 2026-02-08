// State Management Module with LocalStorage
export const state = {
    mode: null,
    startingPoints: 0,
    currentPoints: 0,
    
    selections: {
        metaAwareness: null,
        metaKnowledge: null,
        metaStoryType: null,
        metaOther: [],
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
    
    repeatCounts: {
        'tier1-wealth': 0,
        'tier1-guset': 0,
        'tier1-recipes': 0,
        'tier2-superguset': 0,
        'tier2-borndao': 0,
        'tier2-growth': 0
    },
    
    attainmentCounts: {
        grandmaster: 0,
        greatGrandmaster: 0
    },
    
    customInputs: {
        immortalParents: ''
    },
    
    disabledSections: [],
    setupComplete: false
};

const STORAGE_KEY = 'ri-cyoa-state';

export function getSelection(category) {
    return state.selections[category];
}

export function setSelection(category, value) {
    state.selections[category] = value;
    saveToLocalStorage();
}

export function addSelection(category, value) {
    if (!state.selections[category].includes(value)) {
        state.selections[category].push(value);
        saveToLocalStorage();
    }
}

export function removeSelection(category, value) {
    const index = state.selections[category].indexOf(value);
    if (index > -1) {
        state.selections[category].splice(index, 1);
        saveToLocalStorage();
    }
}

export function toggleSelection(category, value) {
    if (state.selections[category].includes(value)) {
        removeSelection(category, value);
        return false;
    } else {
        addSelection(category, value);
        return true;
    }
}

export function isSelected(category, optionId) {
    const selection = state.selections[category];
    if (Array.isArray(selection)) {
        return selection.includes(optionId);
    }
    return selection === optionId;
}

export function incrementRepeat(optionId, subkey = null) {
    if (subkey) {
        if (!state.repeatCounts[optionId]) state.repeatCounts[optionId] = {};
        if (!state.repeatCounts[optionId][subkey]) state.repeatCounts[optionId][subkey] = 0;
        state.repeatCounts[optionId][subkey]++;
        saveToLocalStorage();
        return state.repeatCounts[optionId][subkey];
    } else {
        if (!state.repeatCounts[optionId]) state.repeatCounts[optionId] = 0;
        state.repeatCounts[optionId]++;
        saveToLocalStorage();
        return state.repeatCounts[optionId];
    }
}

export function decrementRepeat(optionId, subkey = null) {
    if (subkey) {
        if (state.repeatCounts[optionId] && state.repeatCounts[optionId][subkey]) {
            state.repeatCounts[optionId][subkey]--;
            if (state.repeatCounts[optionId][subkey] <= 0) {
                delete state.repeatCounts[optionId][subkey];
            }
            saveToLocalStorage();
        }
    } else {
        if (state.repeatCounts[optionId]) {
            state.repeatCounts[optionId]--;
            if (state.repeatCounts[optionId] <= 0) state.repeatCounts[optionId] = 0;
            saveToLocalStorage();
        }
    }
}

export function getRepeatCount(optionId, subkey = null) {
    if (subkey) return state.repeatCounts[optionId]?.[subkey] || 0;
    return state.repeatCounts[optionId] || 0;
}

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
    
    state.attainmentCounts = { grandmaster: 0, greatGrandmaster: 0 };
    state.customInputs = { immortalParents: '' };
    state.disabledSections = [];
    state.setupComplete = false;
    
    saveToLocalStorage();
}

export function exportState() {
    return JSON.stringify(state, null, 2);
}

export function importState(jsonString) {
    try {
        const imported = JSON.parse(jsonString);
        Object.assign(state, imported);
        saveToLocalStorage();
        return true;
    } catch (error) {
        console.error('Failed to import state:', error);
        return false;
    }
}

export function disableSections(sections) {
    state.disabledSections = [...new Set([...state.disabledSections, ...sections])];
    saveToLocalStorage();
}

export function enableSections(sections) {
    state.disabledSections = state.disabledSections.filter(s => !sections.includes(s));
    saveToLocalStorage();
}

export function isSectionDisabled(section) {
    return state.disabledSections.includes(section);
}

export function clearDisabledSections() {
    state.disabledSections = [];
    saveToLocalStorage();
}

export function markSetupComplete() {
    state.setupComplete = true;
    saveToLocalStorage();
}

// ========== LocalStorage ==========
export function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

export function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);
            console.log('✅ Build loaded from localStorage');
            return true;
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
    }
    return false;
}

export function clearLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ localStorage cleared');
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
    }
}

export function hasLocalStorageData() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
        return false;
    }
}