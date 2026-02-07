// ==============================
// Utility Functions
// ==============================

// Create element with classes and properties
export function createEl(tag, className = '', props = {}) {
    const el = document.createElement(tag);

    if (className) {
        el.className = className;
    }

    Object.assign(el, props);
    return el;
}

// Capitalize first letter with special cases
export function capitalize(str) {
    // Special attainment cases
    switch (str) {
        case 'greatgrandmaster':
            return 'Great Grandmaster';
        case 'grandmaster':
            return 'Grandmaster';
        case 'master':
            return 'Master';
        default:
            return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Format number with commas
export function formatNumber(num) {
    return num.toLocaleString();
}

// Get cost display string
export function getCostDisplay(cost) {
    if (cost === 0) return 'Free';
    if (cost > 0) return `+${cost} CP`;
    return `${cost} CP`;
}

// Get cost class for styling
export function getCostClass(cost) {
    if (cost === 0) return 'free';
    if (cost > 0) return 'gives-points';
    return 'costs-points';
}

// Check if array has any of the values
export function hasAny(arr, values) {
    return values.some(value => arr.includes(value));
}

// ==============================
// Requirement & Conflict Checks
// ==============================

// Check if all requirements are met
export function checkRequirements(option, selections) {
    if (!option.requires) return true;

    const requires = Array.isArray(option.requires)
        ? option.requires
        : [option.requires];

    for (const req of requires) {
        let found = false;

        for (const category in selections) {
            const selection = selections[category];

            if (Array.isArray(selection) && selection.includes(req)) {
                found = true;
                break;
            }

            if (selection === req) {
                found = true;
                break;
            }
        }

        if (!found) return false;
    }

    return true;
}

// Check if there are conflicts
export function checkConflicts(option, selections) {
    if (!option.conflicts) return false;

    const conflicts = Array.isArray(option.conflicts)
        ? option.conflicts
        : [option.conflicts];

    for (const conflict of conflicts) {
        for (const category in selections) {
            const selection = selections[category];

            if (Array.isArray(selection) && selection.includes(conflict)) {
                return true;
            }

            if (selection === conflict) {
                return true;
            }
        }
    }

    return false;
}

// Check timeline requirement
export function checkTimelineRequirement(option, timeline) {
    if (!option.requiresTimeline) return true;
    return timeline === option.requiresTimeline;
}

// ==============================
// Helpers
// ==============================

// Debounce function
export function debounce(func, wait) {
    let timeout;

    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Show error message
export function showError(message) {
    alert(message);
}

// Show confirmation dialog
export function showConfirm(message) {
    return confirm(message);
}

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ==============================
// Data Utilities
// ==============================

// Find option by ID across all categories
export function findOptionById(optionId, data) {
    for (const categoryKey in data.categories) {
        const category = data.categories[categoryKey];

        if (!category.options) continue;

        const option = category.options.find(opt => opt.id === optionId);
        if (option) {
            return {
                option,
                category: categoryKey,
                categoryData: category
            };
        }
    }

    return null;
}

// Get all selected option IDs as a flat array
export function getAllSelectedIds(selections) {
    const ids = [];

    for (const category in selections) {
        const selection = selections[category];

        if (Array.isArray(selection)) {
            ids.push(...selection);
        } else if (selection) {
            ids.push(selection);
        }
    }

    return ids;
}

// ==============================
// File Handling
// ==============================

// Download JSON file
export function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

// Load JSON file
export function loadJSONFile(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                callback(data);
            } catch {
                showError('Invalid JSON file');
            }
        };

        reader.readAsText(file);
    });

    input.click();
}