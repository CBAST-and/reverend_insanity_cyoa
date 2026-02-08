import { state, isSelected, getRepeatCount, isSectionDisabled } from './state.js';
import { CYOA_DATA, ATTAINMENT_LIMITS } from './data.js';
import { createEl, getCostDisplay, getCostClass, capitalize } from './utils.js';
import {
    handleSingleSelect,
    handleMultipleSelect,
    handleClanStatusSelect,
    handleRepeatableIncrement,
    handleRepeatableDecrement
} from './selectionHandler.js';
import { updatePointsDisplay, areAttainmentLimitsRemoved } from './pointsManager.js';

/* ================= DIFFICULTY TAB ================= */

export function renderDifficultyTab() {
    const container = document.getElementById('difficulty-options');
    if (!container) return;

    container.innerHTML = '';

    CYOA_DATA.modes.forEach(mode => {
        const card = createEl('div', 'option-card difficulty-mode-card');

        if (state.mode === mode.id) {
            card.classList.add('selected');
        }

        card.innerHTML = `
            <h3>${mode.name}</h3>
            <p class="difficulty-points">${mode.points.toLocaleString()} CP</p>
            <p class="description">${mode.description}</p>
        `;

        card.onclick = () => {
            container.querySelectorAll('.option-card')
                .forEach(c => c.classList.remove('selected'));

            card.classList.add('selected');

            state.mode = mode.id;
            state.startingPoints = mode.points;
            state.currentPoints = mode.points;

            updatePointsDisplay();
            updateSummary();
        };

        container.appendChild(card);
    });
}

/* ================= MAIN RENDER ================= */

export function renderAllContent() {
    renderDifficultyTab();
    renderBasicsTab();
    renderLocationTab();
    renderAptitudeTab();
    renderPowerTab();
    renderPerksTab();
    renderPremiumTab();
    renderChallengesTab();
}

/* ================= TAB RENDERERS ================= */

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

/* ================= CATEGORY ================= */

function renderCategory(categoryKey, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categoryData = CYOA_DATA.categories[categoryKey];
    if (!categoryData) return;

    const parent = container.closest('.category');
    if (parent && categoryData.description) {
        let desc = parent.querySelector('.category-description');
        if (!desc) {
            desc = createEl('p', 'category-description');
            const title = parent.querySelector('.category-title');
            title?.after(desc);
        }
        desc.textContent = categoryData.description;
        desc.style.display = 'block';
    }

    // Clear ONLY the options
    container.innerHTML = '';

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

    if (isSelected(categoryKey, option.id)) card.classList.add('selected');
    if (isSectionDisabled(categoryKey)) card.classList.add('disabled');
    if (option.repeatable) card.classList.add('repeatable');
    if (option.negative) card.classList.add('negative');

    card.innerHTML = `
        <h3>${option.name}</h3>
        <p class="cost ${getCostClass(option.cost)}">${getCostDisplay(option.cost)}</p>
        <p class="description">${option.description}</p>
    `;

    if (option.repeatable && selectionType === 'multiple') {
        const count = getRepeatCount(option.id);

        const counter = createEl('div', 'counter-controls');
        counter.innerHTML = `
            <button class="counter-btn counter-minus">−</button>
            <div class="counter-display">
                <span class="counter-value">${count}</span>
            </div>
            <button class="counter-btn counter-plus">+</button>
            <span class="counter-total">
                ${count > 0 ? `Total: ${getCostDisplay(option.cost * count)}` : ''}
            </span>
        `;

        counter.querySelector('.counter-minus').onclick = e => {
            e.stopPropagation();
            if (count > 0) {
                handleRepeatableDecrement(categoryKey, option.id);
                renderCategory(categoryKey, containerId);
            }
        };

        counter.querySelector('.counter-plus').onclick = e => {
            e.stopPropagation();
            handleRepeatableIncrement(categoryKey, option.id);
            renderCategory(categoryKey, containerId);
        };

        card.appendChild(counter);
        return card;
    }

    card.onclick = () => {
        if (isSectionDisabled(categoryKey)) return;

        if (selectionType === 'single') {
            handleSingleSelect(categoryKey, option.id);
            renderCategory(categoryKey, containerId);
        } else {
            handleMultipleSelect(categoryKey, option.id);
            card.classList.toggle('selected', isSelected(categoryKey, option.id));
        }

        if (categoryKey === 'clanTier') {
            renderClanStatusOptions(option.id);
        }

        if (categoryKey === 'grabBagBundles') {
            renderGrabBagSelection(option.id);
        }
    };

    return card;
}

/* ================= CLAN STATUS ================= */

function renderClanStatusOptions(clanTierId) {
    const section = document.getElementById('clan-status-section');
    const container = document.getElementById('clan-status-options');
    const desc = document.getElementById('clan-status-desc');

    if (!section || !container) return;

    const clanTier = CYOA_DATA.categories.clanTier.options
        .find(opt => opt.id === clanTierId);

    if (!clanTier?.statusOptions) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';
    desc.textContent = `Select your status in ${clanTier.name}`;

    clanTier.statusOptions.forEach(status => {
        const card = createEl('div', 'option-card');

        if (state.selections.clanStatus === status.id) {
            card.classList.add('selected');
        }

        card.innerHTML = `
            <h3>${status.name}</h3>
            <p class="cost ${getCostClass(status.cost)}">${getCostDisplay(status.cost)}</p>
        `;

        card.onclick = () => {
            handleClanStatusSelect(status.id);
            container.querySelectorAll('.option-card')
                .forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        };

        container.appendChild(card);
    });
}

/* ================= TIERS ================= */

function renderTierSection(tierKey, sectionId) {
    const section = document.getElementById(sectionId);
    const tierData = CYOA_DATA.categories[tierKey];
    if (!section || !tierData) return;

    section.innerHTML = `
        <section class="category">
            <h2 class="category-title">${tierData.title}</h2>
            ${tierData.description ? `<p class="category-description">${tierData.description}</p>` : ''}
            <div id="${tierKey}-options" class="options-grid"></div>
        </section>
    `;

    renderCategory(tierKey, `${tierKey}-options`);
}

/* ================= ATTAINMENTS ================= */

export function renderAttainmentBuilder() {
    const select = document.getElementById('attainment-path-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose Path --</option>';

    CYOA_DATA.paths.forEach(path => {
        const opt = createEl('option');
        opt.value = path;
        opt.textContent = `${capitalize(path)} Path`;
        select.appendChild(opt);
    });

    updateAttainmentLimits();
    renderAttainmentList();
}

export function updateAttainmentLimits() {
    const gm = document.getElementById('gm-count');
    const ggm = document.getElementById('ggm-count');
    const msg = document.getElementById('no-limits-msg');

    if (areAttainmentLimitsRemoved()) {
        msg && (msg.style.display = 'block');
        gm && (gm.textContent = `${state.attainmentCounts.grandmaster}/∞`);
        ggm && (ggm.textContent = `${state.attainmentCounts.greatGrandmaster}/∞`);
    } else {
        msg && (msg.style.display = 'none');
        gm && (gm.textContent = `${state.attainmentCounts.grandmaster}/${ATTAINMENT_LIMITS.grandmaster}`);
        ggm && (ggm.textContent = `${state.attainmentCounts.greatGrandmaster}/${ATTAINMENT_LIMITS.greatGrandmaster}`);
    }
}

export function renderAttainmentList() {
    const list = document.getElementById('attainment-list');
    if (!list) return;

    if (!state.selections.attainments.length) {
        list.innerHTML = '<p class="info-text">No attainments selected yet</p>';
        return;
    }

    list.innerHTML = '';

    state.selections.attainments.forEach((att, i) => {
        const item = createEl('div', 'attainment-item');

        item.innerHTML = `
            <div>
                <div class="attainment-item-path">${capitalize(att.path)} Path</div>
                <div>${capitalize(att.level)}</div>
            </div>
            <button class="attainment-item-remove">Remove</button>
        `;

        item.querySelector('button').onclick = () =>
            import('./selectionHandler.js')
                .then(m => m.handleAttainmentRemove(i));

        list.appendChild(item);
    });
}

/* ================= GRAB BAG ================= */

export function renderGrabBagSelection(bundleId) {
    const grid = document.getElementById('grab-bag-items');
    const selected = document.getElementById('grab-selected');
    const max = document.getElementById('grab-max');

    if (!grid || !selected || !max) return;

    const bundle = CYOA_DATA.categories.grabBagBundles.options
        .find(b => b.id === bundleId);
    if (!bundle) return;

    max.textContent = bundle.count;
    grid.innerHTML = '';

    CYOA_DATA.grabBagItems.forEach(item => {
        const card = createEl('div', 'grab-item');

        const picked = state.selections.grabBagPerks.includes(item.id);
        if (picked) card.classList.add('selected');

        if (!picked && state.selections.grabBagPerks.length >= bundle.count) {
            card.classList.add('disabled');
        }

        card.innerHTML = `<h4>${item.name}</h4><p>${item.description}</p>`;

        card.onclick = () => {
            if (card.classList.contains('disabled')) return;

            const idx = state.selections.grabBagPerks.indexOf(item.id);
            idx >= 0
                ? state.selections.grabBagPerks.splice(idx, 1)
                : state.selections.grabBagPerks.push(item.id);

            renderGrabBagSelection(bundleId);
            updateSummary();
        };

        grid.appendChild(card);
    });

    selected.textContent = state.selections.grabBagPerks.length;
}

/* ================= SUMMARY ================= */

export function updateSummary() {
    const container = document.getElementById('summary-content');
    if (!container) return;

    container.innerHTML = '';

    const sections = [];

    for (const key in state.selections) {
        const sel = state.selections[key];
        const cat = CYOA_DATA.categories[key];
        if (!cat) continue;

        const items = Array.isArray(sel)
            ? sel.map(id => cat.options.find(o => o.id === id)).filter(Boolean)
            : sel ? [cat.options.find(o => o.id === sel)] : [];

        if (items.length) {
            sections.push({
                title: cat.title,
                items: items.map(o => ({ name: o.name, cost: o.cost }))
            });
        }
    }

    if (state.selections.attainments.length) {
        sections.push({
            title: 'Attainments',
            items: state.selections.attainments.map(a => ({
                name: `${capitalize(a.path)} - ${capitalize(a.level)}`,
                cost: 0
            }))
        });
    }

    if (!sections.length) {
        container.innerHTML = '<p class="info-text">No selections yet.</p>';
        return;
    }

    sections.forEach(sec => {
        const block = createEl('div', 'summary-category');
        block.innerHTML = `<h3>${sec.title}</h3><ul></ul>`;

        sec.items.forEach(i => {
            const li = createEl('li');
            li.innerHTML = `
                <span>${i.name}</span>
                <span class="${getCostClass(i.cost)}">${getCostDisplay(i.cost)}</span>
            `;
            block.querySelector('ul').appendChild(li);
        });

        container.appendChild(block);
    });
}

/* ================= EXPORT ================= */

export default {
    renderAllContent,
    renderDifficultyTab,
    updateSummary,
    renderGrabBagSelection,
    renderAttainmentList,
    updateAttainmentLimits
};
