// Main Entry Point - Initializes the CYOA

import {
    state,
    resetState,
    exportState,
    importState
} from './state.js';

import {
    renderModes,
    renderAllContent,
    updateSummary
} from './renderer.js';

import {
    updatePointsDisplay,
    recalculateAllPoints
} from './pointsManager.js';

import {
    downloadJSON,
    loadJSONFile,
    showError,
    showConfirm
} from './utils.js';

import {
    CYOA_DATA,
    ATTAINMENT_COSTS
} from './data.js';

/* =========================
   Initialization
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Reverend Insanity CYOA Initializing...');
    init();
});

function init() {
    renderModes();

    setupTabNavigation();
    setupAttainmentControls();
    setupExportImportReset();

    console.log('CYOA Ready!');
}

/* =========================
   Tab Navigation
   ========================= */
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');

            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

/* =========================
   Attainments
   ========================= */
function setupAttainmentControls() {
    const addMasterBtn = document.getElementById('add-master-btn');
    const addGrandmasterBtn = document.getElementById('add-grandmaster-btn');
    const addGreatGMBtn = document.getElementById('add-greatgm-btn');

    if (addMasterBtn) {
        addMasterBtn.addEventListener('click', () => addAttainment('master'));
    }

    if (addGrandmasterBtn) {
        addGrandmasterBtn.addEventListener('click', () =>
            addAttainment('grandmaster')
        );
    }

    if (addGreatGMBtn) {
        addGreatGMBtn.addEventListener('click', () =>
            addAttainment('greatgrandmaster')
        );
    }
}

async function addAttainment(level) {
    const pathSelect = document.getElementById('attainment-path-select');
    if (!pathSelect) return;

    const path = pathSelect.value;
    if (!path) {
        showError('Please select a path first.');
        return;
    }

    const existing = state.selections.attainments.find(a => a.path === path);
    const discount =
        state.selections.tier5.includes('tier5-dreamven') ? 0.5 : 1;

    if (existing) {
        const levels = ['master', 'grandmaster', 'greatgrandmaster'];
        const existingIndex = levels.indexOf(existing.level);
        const newIndex = levels.indexOf(level);

        if (newIndex <= existingIndex) {
            showError(
                `This path already has ${existing.level} attainment or higher.`
            );
            return;
        }

        const limitsRemoved =
            state.selections.tier5.includes('tier5-dreamven');

        if (!limitsRemoved) {
            if (
                level === 'grandmaster' &&
                state.attainmentCounts.grandmaster >= 4 &&
                existing.level !== 'grandmaster'
            ) {
                showError('Maximum 4 grandmaster attainments allowed.');
                return;
            }

            if (
                level === 'greatgrandmaster' &&
                state.attainmentCounts.greatGrandmaster >= 2 &&
                existing.level !== 'greatgrandmaster'
            ) {
                showError('Maximum 2 great grandmaster attainments allowed.');
                return;
            }
        }

        const oldCost = ATTAINMENT_COSTS[existing.level];
        const newCost = ATTAINMENT_COSTS[level];
        const costDiff = Math.floor((newCost - oldCost) * discount);

        if (existing.level === 'grandmaster') {
            state.attainmentCounts.grandmaster--;
        }
        if (existing.level === 'greatgrandmaster') {
            state.attainmentCounts.greatGrandmaster--;
        }
        if (level === 'grandmaster') {
            state.attainmentCounts.grandmaster++;
        }
        if (level === 'greatgrandmaster') {
            state.attainmentCounts.greatGrandmaster++;
        }

        existing.level = level;
        state.currentPoints -= costDiff;
    } else {
        const limitsRemoved =
            state.selections.tier5.includes('tier5-dreamven');

        if (!limitsRemoved) {
            if (
                level === 'grandmaster' &&
                state.attainmentCounts.grandmaster >= 4
            ) {
                showError('Maximum 4 grandmaster attainments allowed.');
                return;
            }

            if (
                level === 'greatgrandmaster' &&
                state.attainmentCounts.greatGrandmaster >= 2
            ) {
                showError('Maximum 2 great grandmaster attainments allowed.');
                return;
            }
        }

        const cost = ATTAINMENT_COSTS[level];
        const finalCost = Math.floor(cost * discount);

        state.selections.attainments.push({ path, level });
        state.currentPoints -= finalCost;

        if (level === 'grandmaster') {
            state.attainmentCounts.grandmaster++;
        }
        if (level === 'greatgrandmaster') {
            state.attainmentCounts.greatGrandmaster++;
        }
    }

    const {
        renderAttainmentList,
        updateAttainmentLimits
    } = await import('./renderer.js');

    renderAttainmentList();
    updateAttainmentLimits();
    updatePointsDisplay();
    updateSummary();
}

/* =========================
   Export / Import / Reset
   ========================= */
function setupExportImportReset() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = exportState();
            downloadJSON(
                JSON.parse(data),
                'reverend-insanity-build.json'
            );
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            loadJSONFile(data => {
                if (importState(JSON.stringify(data))) {
                    document.getElementById('mode-selection').style.display =
                        'none';
                    document.getElementById('points-display').style.display =
                        'flex';
                    document.getElementById('tab-navigation').style.display =
                        'flex';
                    document.getElementById('cyoa-content').style.display =
                        'block';

                    renderAllContent();
                    recalculateAllPoints();
                    updateSummary();

                    showError('Build imported successfully!');
                } else {
                    showError(
                        'Failed to import build. Invalid file format.'
                    );
                }
            });
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (
                showConfirm(
                    'Are you sure you want to reset all selections? This cannot be undone.'
                )
            ) {
                resetState();
                location.reload();
            }
        });
    }
}

/* =========================
   Exports
   ========================= */
export default {
    init
};