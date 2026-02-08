import { state, resetState, exportState, importState, loadFromLocalStorage, clearLocalStorage } from './state.js';
import { renderAllContent, updateSummary } from './renderer.js';
import { updatePointsDisplay, recalculateAllPoints } from './pointsManager.js';
import { downloadJSON, loadJSONFile, showError, showConfirm } from './utils.js';
import { CYOA_DATA, ATTAINMENT_COSTS } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Reverend Insanity CYOA V2 Initializing...');
    init();
});

/* ================================
   CATEGORY DESCRIPTION INJECTION
================================ */
function injectCategoryDescriptions() {
    document.querySelectorAll('.category[data-category]').forEach(section => {
        const key = section.dataset.category;
        const data = CYOA_DATA.categories[key];
        if (!data) return;

        const desc = section.querySelector('.category-description');
        if (!desc) return;

        desc.textContent = data.description || '';
        desc.style.display = data.description ? 'block' : 'none';
    });
}

function init() {
    // Inject static metadata FIRST
    injectCategoryDescriptions();

    // Try to load from localStorage first
    const hasData = loadFromLocalStorage();
    
    if (hasData) {
        renderAllContent();
        recalculateAllPoints();
        updateSummary();
        console.log('✅ Restored previous build from localStorage');
    } else {
        renderAllContent();
        console.log('✅ Fresh start - no saved data');
    }
    
    setupTabNavigation();
    setupAttainmentControls();
    setupSettingsMenu();
    setupThemeToggle();
    
    console.log('CYOA Ready!');
}

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

function setupAttainmentControls() {
    const addMasterBtn = document.getElementById('add-master-btn');
    const addGrandmasterBtn = document.getElementById('add-grandmaster-btn');
    const addGreatGMBtn = document.getElementById('add-greatgm-btn');
    
    if (addMasterBtn) {
        addMasterBtn.addEventListener('click', () => addAttainment('master'));
    }
    if (addGrandmasterBtn) {
        addGrandmasterBtn.addEventListener('click', () => addAttainment('grandmaster'));
    }
    if (addGreatGMBtn) {
        addGreatGMBtn.addEventListener('click', () => addAttainment('greatgrandmaster'));
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
    const discount = state.selections.tier5.includes('tier5-dreamven') ? 0.5 : 1;
    
    if (existing) {
        const levels = ['master', 'grandmaster', 'greatgrandmaster'];
        const existingIndex = levels.indexOf(existing.level);
        const newIndex = levels.indexOf(level);
        
        if (newIndex <= existingIndex) {
            showError(`This path already has ${existing.level} attainment or higher.`);
            return;
        }
        
        const limitsRemoved = state.selections.tier5.includes('tier5-dreamven');
        
        if (!limitsRemoved) {
            if (level === 'grandmaster' && state.attainmentCounts.grandmaster >= 4) {
                showError('Maximum 4 grandmaster attainments allowed.');
                return;
            }
            if (level === 'greatgrandmaster' && state.attainmentCounts.greatGrandmaster >= 2) {
                showError('Maximum 2 great grandmaster attainments allowed.');
                return;
            }
        }
        
        const oldCost = ATTAINMENT_COSTS[existing.level];
        const newCost = ATTAINMENT_COSTS[level];
        const costDiff = Math.floor((newCost - oldCost) * discount);
        
        if (existing.level === 'grandmaster') state.attainmentCounts.grandmaster--;
        if (existing.level === 'greatgrandmaster') state.attainmentCounts.greatGrandmaster--;
        if (level === 'grandmaster') state.attainmentCounts.grandmaster++;
        if (level === 'greatgrandmaster') state.attainmentCounts.greatGrandmaster++;
        
        existing.level = level;
        state.currentPoints -= costDiff;
    } else {
        const limitsRemoved = state.selections.tier5.includes('tier5-dreamven');
        
        if (!limitsRemoved) {
            if (level === 'grandmaster' && state.attainmentCounts.grandmaster >= 4) {
                showError('Maximum 4 grandmaster attainments allowed.');
                return;
            }
            if (level === 'greatgrandmaster' && state.attainmentCounts.greatGrandmaster >= 2) {
                showError('Maximum 2 great grandmaster attainments allowed.');
                return;
            }
        }
        
        const cost = ATTAINMENT_COSTS[level];
        const finalCost = Math.floor(cost * discount);
        
        state.selections.attainments.push({ path, level });
        state.currentPoints -= finalCost;
        
        if (level === 'grandmaster') state.attainmentCounts.grandmaster++;
        if (level === 'greatgrandmaster') state.attainmentCounts.greatGrandmaster++;
    }
    
    const { renderAttainmentList, updateAttainmentLimits } = await import('./renderer.js');
    renderAttainmentList();
    updateAttainmentLimits();
    updatePointsDisplay();
    updateSummary();
}

// ========== Settings Menu ==========
function setupSettingsMenu() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeBtn = document.querySelector('.settings-close');
    
    if (!settingsBtn || !settingsMenu) return;
    
    // Toggle menu
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const isOpen = settingsMenu.classList.contains('open');
        if (isOpen) {
            closeSettingsMenu();
        } else {
            openSettingsMenu();
        }
    });
    
    // Close when clicking overlay
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', closeSettingsMenu);
    }

    // Close when clicking close button
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeSettingsMenu();
        });
    }
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
            closeSettingsMenu();
        }
    });
    
    // Settings menu actions
    document.getElementById('settings-export')?.addEventListener('click', () => {
        const data = exportState();
        downloadJSON(JSON.parse(data), 'reverend-insanity-build.json');
        closeSettingsMenu();
    });
    
    document.getElementById('settings-import')?.addEventListener('click', () => {
        loadJSONFile(data => {
            if (importState(JSON.stringify(data))) {
                renderAllContent();
                recalculateAllPoints();
                updateSummary();
                alert('Build imported successfully!');
            } else {
                showError('Failed to import build. Invalid file format.');
            }
        });
        closeSettingsMenu();
    });
    
    document.getElementById('settings-reset')?.addEventListener('click', () => {
        if (showConfirm('Are you sure you want to reset ALL selections? This cannot be undone.')) {
            resetState();
            clearLocalStorage();
            location.reload();
        }
        closeSettingsMenu();
    });
    
    document.getElementById('settings-theme')?.addEventListener('click', () => {
        toggleTheme();
        closeSettingsMenu();
    });
}

function openSettingsMenu() {
    const menu = document.getElementById('settings-menu');
    const overlay = document.getElementById('settings-overlay');
    if (menu) menu.classList.add('open');
    if (overlay) overlay.classList.add('show');
}

function closeSettingsMenu() {
    const menu = document.getElementById('settings-menu');
    const overlay = document.getElementById('settings-overlay');
    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

// ========== Theme Toggle ==========
function setupThemeToggle() {
    const savedTheme = localStorage.getItem('ri-cyoa-theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
    }
}

function toggleTheme() {
    document.documentElement.classList.toggle('light-theme');
    const isLight = document.documentElement.classList.contains('light-theme');
    localStorage.setItem('ri-cyoa-theme', isLight ? 'light' : 'dark');
}

export default { init };