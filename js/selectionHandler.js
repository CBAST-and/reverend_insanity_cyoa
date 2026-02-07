// Selection Handler - Manages user selections and their effects

import {
    state,
    setSelection,
    toggleSelection,
    incrementRepeat,
    decrementRepeat,
    getRepeatCount,
    isSelected,
    disableSections,
    enableSections
} from './state.js';

import {
    applyCost,
    reverseCost,
    getTier5Cost,
    updatePointsDisplay,
    applyGiantSunBonus
} from './pointsManager.js';

import {
    checkRequirements,
    checkConflicts,
    checkTimelineRequirement,
    showError,
    showConfirm
} from './utils.js';

import { CYOA_DATA, ATTAINMENT_COSTS } from './data.js';
import { updateSummary } from './renderer.js';

/* =========================
   Single Selection Handler
   ========================= */
export function handleSingleSelect(category, optionId) {
    const categoryData = CYOA_DATA.categories[category];
    const option = categoryData.options.find(opt => opt.id === optionId);

    if (!option) return;

    // Requirements
    if (!checkRequirements(option, state.selections)) {
        showError('Requirements not met for this option.');
        return;
    }

    // Conflicts
    if (checkConflicts(option, state.selections)) {
        showError('This option conflicts with a currently selected option.');
        return;
    }

    // Timeline
    if (!checkTimelineRequirement(option, state.selections.timeline)) {
        showError('This option requires a specific timeline.');
        return;
    }

    // Previous selection
    const previousId = state.selections[category];
    let previousCost = 0;

    if (previousId) {
        const previousOption = categoryData.options.find(
            opt => opt.id === previousId
        );

        if (previousOption) {
            previousCost = previousOption.cost;

            if (previousOption.disables) {
                enableSections(previousOption.disables);
            }
        }
    }

    // Apply new selection
    setSelection(category, optionId);

    reverseCost(previousCost);
    applyCost(option.cost);

    if (option.disables) {
        disableSections(option.disables);
        
        // Clear any selections in disabled sections
        option.disables.forEach(disabledCategory => {
            const currentSelection = state.selections[disabledCategory];
            
            if (currentSelection !== null && currentSelection !== undefined) {
                // Handle array selections (multi-select)
                if (Array.isArray(currentSelection) && currentSelection.length > 0) {
                    // Reverse costs for each selected item
                    currentSelection.forEach(selectedId => {
                        const categoryData = CYOA_DATA.categories[disabledCategory];
                        if (categoryData && categoryData.options) {
                            const selectedOption = categoryData.options.find(opt => opt.id === selectedId);
                            if (selectedOption) {
                                reverseCost(selectedOption.cost);
                            }
                        }
                    });
                    state.selections[disabledCategory] = [];
                } 
                // Handle single selections
                else if (!Array.isArray(currentSelection)) {
                    const categoryData = CYOA_DATA.categories[disabledCategory];
                    if (categoryData && categoryData.options) {
                        const selectedOption = categoryData.options.find(opt => opt.id === currentSelection);
                        if (selectedOption) {
                            reverseCost(selectedOption.cost);
                        }
                    }
                    state.selections[disabledCategory] = null;
                }
            }
        });
        
        // Re-render all content to reflect the changes
        import('./renderer.js').then(({ renderAllContent }) => {
            renderAllContent();
        });
    }

    if (category === 'venerable' && optionId === 'ven-giant') {
        handleGiantSun();
    }

    // Trigger grab bag selection interface if this is a grab bag bundle
    if (category === 'grabBagBundles') {
        import('./renderer.js').then(({ renderGrabBagSelection }) => {
            renderGrabBagSelection(optionId);
        });
    }

    updatePointsDisplay();
    updateSummary();
}

/* =========================
   Multiple Selection Toggle
   ========================= */
export function handleMultipleSelect(category, optionId) {
    const categoryData = CYOA_DATA.categories[category];
    const option = categoryData.options.find(opt => opt.id === optionId);

    if (!option) return;

    const isCurrentlySelected = isSelected(category, optionId);

    if (isCurrentlySelected) {
        toggleSelection(category, optionId);

        if (option.repeatable) {
            // Don't decrement here - that's handled by handleRepeatableDecrement
            const count = getRepeatCount(optionId);
            if (count > 0) {
                reverseCost(option.cost * count);
            }
        } else {
            reverseCost(option.cost);
        }
    } else {
        if (!checkRequirements(option, state.selections)) {
            showError('Requirements not met for this option.');
            return;
        }

        if (checkConflicts(option, state.selections)) {
            showError('This option conflicts with a currently selected option.');
            return;
        }

        if (option.maxCount) {
            const currentCount = getRepeatCount(optionId);
            if (currentCount >= option.maxCount) {
                showError(`Maximum ${option.maxCount} purchases allowed.`);
                return;
            }
        }

        if (category === 'tier5') {
            const tier5Count = state.selections.tier5.length;

            if (tier5Count > 0) {
                const surcharge = tier5Count * 200;
                const message =
                    `This is your ${tier5Count + 1}${getOrdinal(tier5Count + 1)} ` +
                    `Tier 5 perk. It will cost an additional ${surcharge} CP. Continue?`;

                if (!showConfirm(message)) return;

                applyCost(-surcharge);
            }
        }

        toggleSelection(category, optionId);

        if (option.repeatable) {
            // Don't increment here - that's handled by handleRepeatableIncrement
        } else {
            applyCost(option.cost);
        }
    }

    updatePointsDisplay();
    updateSummary();
}

/* =========================
   Repeatable Item Handlers
   ========================= */
export function handleRepeatableIncrement(category, optionId) {
    const categoryData = CYOA_DATA.categories[category];
    const option = categoryData.options.find(opt => opt.id === optionId);

    if (!option || !option.repeatable) return;

    // Check max count
    if (option.maxCount) {
        const currentCount = getRepeatCount(optionId);
        if (currentCount >= option.maxCount) {
            showError(`Maximum ${option.maxCount} purchases allowed.`);
            return;
        }
    }

    // If not selected yet, add to selections
    if (!isSelected(category, optionId)) {
        if (!checkRequirements(option, state.selections)) {
            showError('Requirements not met for this option.');
            return;
        }

        if (checkConflicts(option, state.selections)) {
            showError('This option conflicts with a currently selected option.');
            return;
        }

        toggleSelection(category, optionId);
    }

    // Increment count and apply cost
    incrementRepeat(optionId);
    applyCost(option.cost);

    updatePointsDisplay();
    updateSummary();
}

export function handleRepeatableDecrement(category, optionId) {
    const categoryData = CYOA_DATA.categories[category];
    const option = categoryData.options.find(opt => opt.id === optionId);

    if (!option || !option.repeatable) return;

    const currentCount = getRepeatCount(optionId);
    if (currentCount <= 0) return;

    // Decrement count and reverse cost
    decrementRepeat(optionId);
    reverseCost(option.cost);

    // If count reaches 0, remove from selections
    if (getRepeatCount(optionId) === 0) {
        toggleSelection(category, optionId);
    }

    updatePointsDisplay();
    updateSummary();
}

/* =========================
   Clan Status Sub-Selection
   ========================= */
export function handleClanStatusSelect(statusOptionId) {
    const clanTierId = state.selections.clanTier;
    if (!clanTierId) return;

    const clanTier = CYOA_DATA.categories.clanTier.options.find(
        opt => opt.id === clanTierId
    );

    if (!clanTier || !clanTier.statusOptions) return;

    const statusOption = clanTier.statusOptions.find(
        opt => opt.id === statusOptionId
    );

    if (!statusOption) return;

    const previousStatusId = state.selections.clanStatus;
    let previousCost = 0;

    if (previousStatusId) {
        const previousStatus = clanTier.statusOptions.find(
            opt => opt.id === previousStatusId
        );

        if (previousStatus) {
            previousCost = previousStatus.cost;
        }
    }

    setSelection('clanStatus', statusOptionId);

    reverseCost(previousCost);
    applyCost(statusOption.cost);

    updatePointsDisplay();
    updateSummary();
}

/* =========================
   Attainment Remove Handler
   ========================= */
export function handleAttainmentRemove(index) {
    const att = state.selections.attainments[index];
    if (!att) return;

    // Refund the cost
    const hasDiscount = state.selections.tier5.includes('tier5-dreamven');
    const cost = ATTAINMENT_COSTS[att.level];
    const finalCost = hasDiscount ? Math.floor(cost / 2) : cost;
    
    reverseCost(-finalCost); // Reverse the negative cost (add points back)

    // Update counts
    if (att.level === 'grandmaster') {
        state.attainmentCounts.grandmaster--;
    }
    if (att.level === 'greatGrandmaster') {
        state.attainmentCounts.greatGrandmaster--;
    }

    // Remove from selections
    state.selections.attainments.splice(index, 1);

    // Re-import to get the functions
    import('./renderer.js').then(({ renderAttainmentList, updateAttainmentLimits }) => {
        renderAttainmentList();
        updateAttainmentLimits();
    });
    
    updatePointsDisplay();
    updateSummary();
}

/* =========================
   Giant Sun Logic
   ========================= */
function handleGiantSun() {
    const luckOptions = CYOA_DATA.categories.luck.options;

    luckOptions.forEach(option => {
        if (!isSelected('luck', option.id)) {
            state.selections.luck.push(option.id);
        }
    });
}

/* =========================
   Utilities
   ========================= */
function getOrdinal(n) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}

export default {
    handleSingleSelect,
    handleMultipleSelect,
    handleClanStatusSelect,
    handleAttainmentRemove,
    handleRepeatableIncrement,
    handleRepeatableDecrement
};