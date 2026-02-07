// Utility Functions

// Create element with classes and properties
export function createEl(tag, className = '', props = {}) {
    const el = document.createElement(tag);
    if (className) {
        el.className = className;
    }
    Object.assign(el, props);
    return el;
}

// Capitalize first letter
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    return values.some(v => arr.includes(v));
}

// Check if all requirements are met
export function checkRequirements(option, selections) {
    if (!option.requires) return true;
    
    const requires = Array.isArray(option.requires) ? option.requires : [option.requires];
    
    for (const req of requires) {
        // Check in all selection arrays
        let found = false;
        for (const category in selections) {
            if (Array.isArray(selections[category])) {
                if (selections[category].includes(req)) {
                    found = true;
                    break;
                }
            } else if (selections[category] === req) {
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
    
    const conflicts = Array.isArray(option.conflicts) ? option.conflicts : [option.conflicts];
    
    for (const conflict of conflicts) {
        // Check in all selection arrays
        for (const category in selections) {
            if (Array.isArray(selections[category])) {
                if (selections[category].includes(conflict)) {
                    return true;
                }
            } else if (selections[category] === conflict) {
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

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show error message
export function showError(message) {
    alert(message);
}

// Show confirmation
export function showConfirm(message) {
    return confirm(message);
}

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Find option by ID across all categories
export function findOptionById(optionId, data) {
    for (const categoryKey in data.categories) {
        const category = data.categories[categoryKey];
        if (category.options) {
            const option = category.options.find(opt => opt.id === optionId);
            if (option) {
                return { option, category: categoryKey, categoryData: category };
            }
        }
    }
    return null;
}

// Get all selected option IDs as flat array
export function getAllSelectedIds(selections) {
    const ids = [];
    for (const category in selections) {
        if (Array.isArray(selections[category])) {
            ids.push(...selections[category]);
        } else if (selections[category]) {
            ids.push(selections[category]);
        }
    }
    return ids;
}

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
            } catch (error) {
                showError('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    });
    
    input.click();
}