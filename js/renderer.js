// Renderer Module - Handles all UI rendering

import {
    state,
    isSelected,
    getRepeatCount,
    isSectionDisabled
} from './state.js';

import {
    CYOA_DATA,
    ATTAINMENT_COSTS,
    ATTAINMENT_LIMITS
} from './data.js';

import {
    createEl,
    getCostDisplay,
    getCostClass,
    capitalize
} from './utils.js';

import {
    handleSingleSelect,
    handleMultipleSelect,
    handleClanStatusSelect,
    handleAttainmentRemove
} from './selectionHandler.js';

import {
    updatePointsDisplay,
    areAttainmentLimitsRemoved
} from './pointsManager.js';

/* =========================
   Mode Selection
   ========================= */
export function renderModes() {
    const grid = document.getElementById('mode-grid');
    if (!grid) return;

    grid.innerHTML = '';

    CYOA_DATA.modes.forEach(mode => {
        const card = createEl('div', 'mode-card', {
            innerHTML: `
                <h3>${mode.name}</h3>
                <p class="points">${mode.points.toLocaleString()} CP</p>
                <p class="description">${mode.description}</p>
            `,
            onclick: () => selectMode(mode)
        });

        grid.appendChild(card);
    });
}

function selectMode(mode) {
    document
        .querySelectorAll('.mode-card')
        .forEach(c => c.classList.remove('selected'));

    event.currentTarget.classList.add('selected');

    state.mode = mode.id;
    state.startingPoints = mode.points;
    state.currentPoints = mode.points;

    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('points-display').style.display = 'flex';
    document.getElementById('tab-navigation').style.display = 'flex';
    document.getElementById('cyoa-content').style.display = 'block';

    renderAllContent();
    updatePointsDisplay();
}

/* =========================
   Main Rendering Pipeline
   ========================= */
export function renderAllContent() {
    renderBasicsTab();
    renderLocationTab();
    renderAptitudeTab();
    renderPowerTab();
    renderPerksTab();
    renderPremiumTab();
    renderChallengesTab();
}

/* =========================
   Tabs
   ========================= */
function renderBasicsTab() {
    renderCategory('timeline', 'timeline-options');
    renderCategory('prep', 'prep-options');
    renderCategory('race', 'race-options');
    renderCategory('sex', 'sex-options');
    renderCategory('appearance', 'appearance-options');
    renderCategory('specialTraits', 'special-traits-options');
}

function renderLocationTab() {
    renderCategory('clanTier', 'clan-tier-options');
    renderCategory('specialBirth', 'special-birth-options');
}

function renderAptitudeTab() {
    renderCategory('aptitude', 'aptitude-options');
    renderAttainmentBuilder();
}

function renderPowerTab() {
    renderCategory('luck', 'luck-options');
    renderCategory('soul', 'soul-options');
    renderCategory('venerable', 'venerable-options');
}

function renderPerksTab() {
    renderCategory('grabBagBundles', 'grab-bag-bundle-options');
    renderTierSection('tier1', 'tier1-section');
    renderTierSection('tier2', 'tier2-section');
    renderTierSection('tier3', 'tier3-section');
    renderTierSection('tier4', 'tier4-section');
    renderTierSection('tier5', 'tier5-section');
}

function renderPremiumTab() {
    renderCategory('premiumGu', 'premium-gu-options');
}

function renderChallengesTab() {
    renderCategory('missions', 'missions-options');
    renderCategory('drawbacks', 'drawbacks-options');
}

/* =========================
   Category & Option Rendering
   ========================= */
function renderCategory(categoryKey, containerId) {
    const container = document.getElementById(containerId);
    const categoryData = CYOA_DATA.categories[categoryKey];

    if (!container || !categoryData) return;

    container.innerHTML = '';

    // Check if this section is disabled
    const section = container.closest('.category');
    if (section) {
        if (isSectionDisabled(categoryKey)) {
            section.classList.add('disabled');
        } else {
            section.classList.remove('disabled');
        }
    }

    categoryData.options.forEach(option => {
        const card = renderOptionCard(
            option,
            categoryData.type,
            categoryKey,
            containerId
        );
        container.appendChild(card);
    });
}

function renderOptionCard(option, selectionType, categoryKey, containerId) {
    const card = createEl('div', 'option-card');

    if (isSelected(categoryKey, option.id)) {
        card.classList.add('selected');
    }

    if (isSectionDisabled(categoryKey)) {
        card.classList.add('disabled');
    }

    if (option.repeatable) {
        card.classList.add('repeatable');
        const count = getRepeatCount(option.id);
        if (count > 0) card.setAttribute('data-count', count);
    }

    if (option.negative) {
        card.classList.add('negative');
    } else if (option.cost > 0) {
        card.classList.add('positive');
    }

    let costDisplay = getCostDisplay(option.cost);
    const count = option.repeatable ? getRepeatCount(option.id) : 0;
    
    // Build the card HTML
    let cardHTML = `
        <h3>${option.name}</h3>
        <p class="cost ${getCostClass(option.cost)}">${costDisplay}</p>
        <p class="description">${option.description || ''}</p>
    `;
    
    // Add counter controls for repeatable items
    if (option.repeatable) {
        const totalCost = Math.abs(option.cost * count);
        cardHTML += `
            <div class="counter-controls">
                <button class="counter-btn counter-minus" data-option-id="${option.id}">−</button>
                <span class="counter-display">
                    <span class="counter-value">${count}</span>
                </span>
                <button class="counter-btn counter-plus" data-option-id="${option.id}">+</button>
                <span class="counter-total">(Total: ${totalCost} CP)</span>
            </div>
        `;
    }
    
    card.innerHTML = cardHTML;

    // Add click handler for non-repeatable or for the main card area
    if (!option.repeatable) {
        card.onclick = () => {
            if (isSectionDisabled(categoryKey)) return;

            if (selectionType === 'single') {
                handleSingleSelect(categoryKey, option.id);
                rerenderCategory(categoryKey, containerId);
            } else {
                handleMultipleSelect(categoryKey, option.id);
                rerenderOptionCard(card, option, categoryKey);
            }

            if (categoryKey === 'clanTier') {
                renderClanStatusOptions(option.id);
            }

            if (option.needsInput) {
                toggleCustomInput(option.id, true);
            }

            // Check if this option disables sections
            if (option.disables) {
                updateDisabledSections();
            }
        };
    } else {
        // For repeatable items, add event listeners to the +/- buttons
        const minusBtn = card.querySelector('.counter-minus');
        const plusBtn = card.querySelector('.counter-plus');
        
        if (minusBtn) {
            minusBtn.onclick = (e) => {
                e.stopPropagation();
                if (isSectionDisabled(categoryKey)) return;
                
                const currentCount = getRepeatCount(option.id);
                if (currentCount > 0) {
                    handleMultipleSelect(categoryKey, option.id); // This will decrement
                    rerenderCategory(categoryKey, containerId);
                }
            };
        }
        
        if (plusBtn) {
            plusBtn.onclick = (e) => {
                e.stopPropagation();
                if (isSectionDisabled(categoryKey)) return;
                
                // Check max count if applicable
                if (option.maxCount) {
                    const currentCount = getRepeatCount(option.id);
                    if (currentCount >= option.maxCount) {
                        import('./utils.js').then(({ showError }) => {
                            showError(`Maximum ${option.maxCount} purchases allowed.`);
                        });
                        return;
                    }
                }
                
                handleMultipleSelect(categoryKey, option.id); // This will increment
                rerenderCategory(categoryKey, containerId);
            };
        }
    }

    return card;
}

function rerenderOptionCard(card, option, categoryKey) {
    card.classList.toggle(
        'selected',
        isSelected(categoryKey, option.id)
    );

    if (!option.repeatable) return;

    const count = getRepeatCount(option.id);
    const costEl = card.querySelector('.cost');

    if (count > 0) {
        card.setAttribute('data-count', count);
        if (costEl) {
            costEl.textContent = `${getCostDisplay(option.cost)} ×${count}`;
        }
    } else {
        card.removeAttribute('data-count');
        if (costEl) {
            costEl.textContent = getCostDisplay(option.cost);
        }
    }
}

function rerenderCategory(categoryKey, containerId) {
    renderCategory(categoryKey, containerId);
}

/* =========================
   Update Disabled Sections
   ========================= */
function updateDisabledSections() {
    // Re-render all sections that might be affected
    renderBasicsTab();
    renderLocationTab();
}

function toggleCustomInput(optionId, show) {
    const input = document.getElementById('custom-immortal-input');
    if (input) {
        input.style.display = show ? 'block' : 'none';
    }
}

/* =========================
   Clan Status
   ========================= */
function renderClanStatusOptions(clanTierId) {
    const section = document.getElementById('clan-status-section');
    const container = document.getElementById('clan-status-options');
    const desc = document.getElementById('clan-status-desc');

    if (!section || !container) return;

    const clanTier = CYOA_DATA.categories.clanTier.options.find(
        opt => opt.id === clanTierId
    );

    if (!clanTier || !clanTier.statusOptions) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';
    desc.textContent = `Select your status in ${clanTier.name}`;

    clanTier.statusOptions.forEach(statusOpt => {
        const card = createEl('div', 'option-card');

        if (state.selections.clanStatus === statusOpt.id) {
            card.classList.add('selected');
        }

        card.innerHTML = `
            <h3>${statusOpt.name}</h3>
            <p class="cost ${getCostClass(statusOpt.cost)}">
                ${getCostDisplay(statusOpt.cost)}
            </p>
        `;

        card.onclick = () => {
            handleClanStatusSelect(statusOpt.id);
            container
                .querySelectorAll('.option-card')
                .forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        };

        container.appendChild(card);
    });
}

/* =========================
   Tier Section Rendering
   ========================= */
function renderTierSection(tierKey, containerId) {
    const container = document.getElementById(containerId);
    const categoryData = CYOA_DATA.categories[tierKey];

    if (!container || !categoryData) return;

    container.innerHTML = '';

    // Create category wrapper
    const section = createEl('section', 'category');
    section.innerHTML = `
        <h2 class="category-title">${categoryData.title}</h2>
        ${categoryData.description ? `<p class="category-description">${categoryData.description}</p>` : ''}
        <div id="${tierKey}-options" class="options-grid"></div>
    `;

    container.appendChild(section);

    // Render options
    const optionsContainer = section.querySelector(`#${tierKey}-options`);
    categoryData.options.forEach(option => {
        const card = renderOptionCard(
            option,
            categoryData.type,
            tierKey,
            `${tierKey}-options`
        );
        optionsContainer.appendChild(card);
    });
}

/* =========================
   Attainments
   ========================= */
function renderAttainmentBuilder() {
    const pathSelect = document.getElementById('attainment-path-select');
    if (!pathSelect) return;

    pathSelect.innerHTML = '<option value="">-- Choose Path --</option>';

    CYOA_DATA.paths.forEach(path => {
        pathSelect.appendChild(
            createEl('option', '', {
                value: path,
                textContent: `${capitalize(path)} Path`
            })
        );
    });

    updateAttainmentLimits();
    renderAttainmentList();
}

export function updateAttainmentLimits() {
    const gmCount = document.getElementById('gm-count');
    const ggmCount = document.getElementById('ggm-count');
    const noLimitsMsg = document.getElementById('no-limits-msg');

    if (areAttainmentLimitsRemoved()) {
        if (noLimitsMsg) noLimitsMsg.style.display = 'block';
        if (gmCount) gmCount.textContent = `${state.attainmentCounts.grandmaster}/∞`;
        if (ggmCount) ggmCount.textContent = `${state.attainmentCounts.greatGrandmaster}/∞`;
        return;
    }

    if (noLimitsMsg) noLimitsMsg.style.display = 'none';
    if (gmCount) gmCount.textContent =
        `${state.attainmentCounts.grandmaster}/${ATTAINMENT_LIMITS.grandmaster}`;
    if (ggmCount) ggmCount.textContent =
        `${state.attainmentCounts.greatGrandmaster}/${ATTAINMENT_LIMITS.greatGrandmaster}`;
}

export function renderAttainmentList() {
    const listContainer = document.getElementById('attainment-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (state.selections.attainments.length === 0) {
        listContainer.innerHTML = '<p class="info-text">No attainments selected yet</p>';
        return;
    }

    state.selections.attainments.forEach((att, index) => {
        const item = createEl('div', 'attainment-item');
        
        const cost = ATTAINMENT_COSTS[att.level];
        const hasDiscount = state.selections.tier5.includes('tier5-dreamven');
        const finalCost = hasDiscount ? Math.floor(cost / 2) : cost;

        item.innerHTML = `
            <div>
                <span class="attainment-item-path">${capitalize(att.path)} Path</span>
                <span> - ${capitalize(att.level)}</span>
                <span class="cost costs-points"> (${finalCost} CP)</span>
            </div>
            <button class="attainment-item-remove" data-index="${index}">Remove</button>
        `;

        const removeBtn = item.querySelector('.attainment-item-remove');
        removeBtn.addEventListener('click', () => {
            handleAttainmentRemove(index);
        });

        listContainer.appendChild(item);
    });
}

/* =========================
   Grab Bag
   ========================= */
export function renderGrabBagSelection(bundleId) {
    const selection = document.getElementById('grab-bag-selection');
    const itemsGrid = document.getElementById('grab-bag-items');
    const maxSpan = document.getElementById('grab-max');

    if (!selection || !itemsGrid) return;

    const bundle = CYOA_DATA.categories.grabBagBundles.options.find(
        opt => opt.id === bundleId
    );
    if (!bundle) return;

    selection.style.display = 'block';
    maxSpan.textContent = bundle.count;
    itemsGrid.innerHTML = '';

    CYOA_DATA.grabBagItems.forEach(item => {
        const card = createEl('div', 'grab-item');

        const selected = state.selections.grabBagPerks.includes(item.id);
        const atMax =
            state.selections.grabBagPerks.length >= bundle.count &&
            !selected;

        if (selected) card.classList.add('selected');
        if (atMax) card.classList.add('disabled');

        card.innerHTML = `
            <h4>${item.name}</h4>
            <p>${item.description}</p>
        `;

        card.onclick = () => {
            if (card.classList.contains('disabled')) return;

            if (selected) {
                state.selections.grabBagPerks =
                    state.selections.grabBagPerks.filter(id => id !== item.id);
                card.classList.remove('selected');
            } else {
                state.selections.grabBagPerks.push(item.id);
                card.classList.add('selected');
            }

            document.getElementById('grab-selected').textContent =
                state.selections.grabBagPerks.length;

            itemsGrid.querySelectorAll('.grab-item').forEach(c => {
                c.classList.toggle(
                    'disabled',
                    state.selections.grabBagPerks.length >= bundle.count &&
                    !c.classList.contains('selected')
                );
            });

            updateSummary();
        };

        itemsGrid.appendChild(card);
    });

    document.getElementById('grab-selected').textContent =
        state.selections.grabBagPerks.length;
}

/* =========================
   Summary
   ========================= */
export function updateSummary() {
    const summaryContent = document.getElementById('summary-content');
    if (!summaryContent) return;

    summaryContent.innerHTML = '';

    const summaryData = [];

    for (const categoryKey in state.selections) {
        const selection = state.selections[categoryKey];
        const categoryData = CYOA_DATA.categories[categoryKey];
        if (!categoryData) continue;

        if (Array.isArray(selection) && selection.length > 0) {
            const items = selection
                .map(id => {
                    const opt = categoryData.options.find(opt => opt.id === id);
                    if (!opt) return null;
                    
                    // Check if repeatable and get count
                    if (opt.repeatable) {
                        const count = getRepeatCount(id);
                        const totalCost = opt.cost * count;
                        return { 
                            name: `${opt.name} ×${count}`, 
                            cost: totalCost 
                        };
                    }
                    
                    return { name: opt.name, cost: opt.cost };
                })
                .filter(Boolean);

            if (items.length) {
                summaryData.push({ title: categoryData.title, items });
            }
        } else if (selection) {
            const opt = categoryData.options.find(o => o.id === selection);
            if (opt) {
                summaryData.push({
                    title: categoryData.title,
                    items: [{ name: opt.name, cost: opt.cost }]
                });
            }
        }
    }

    if (state.selections.attainments.length > 0) {
        summaryData.push({
            title: 'Attainments',
            items: state.selections.attainments.map(att => ({
                name: `${capitalize(att.path)} - ${capitalize(att.level)}`,
                cost: -ATTAINMENT_COSTS[att.level]
            }))
        });
    }

    if (!summaryData.length) {
        summaryContent.innerHTML =
            '<p class="info-text">No selections yet. Start building your character!</p>';
        return;
    }

    summaryData.forEach(section => {
        const categoryDiv = createEl('div', 'summary-category');
        categoryDiv.innerHTML = `<h3>${section.title}</h3><ul></ul>`;

        const ul = categoryDiv.querySelector('ul');
        section.items.forEach(item => {
            const li = createEl('li');
            li.innerHTML = `
                <span class="summary-item-name">${item.name}</span>
                <span class="summary-item-cost ${getCostClass(item.cost)}">
                    ${getCostDisplay(item.cost)}
                </span>
            `;
            ul.appendChild(li);
        });

        summaryContent.appendChild(categoryDiv);
    });
}

export default {
    renderModes,
    renderAllContent,
    updateSummary,
    renderGrabBagSelection,
    renderAttainmentList,
    updateAttainmentLimits
};