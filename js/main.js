// --- INITIAL DATA ---
const defaultScripts = [
    {
        id: 1,
        title: "Auto-Refresh Dashboard",
        desc: "Automatically refreshes any analytics dashboard every 5 minutes to keep data current.",
        category: "Automation",
        isTampermonkey: true,
        content: "// ==UserScript==\n// @name Auto-Refresh\n// @match *://*/*\n// ==/UserScript==\nsetInterval(() => location.reload(), 300000);",
        url: "https://github.com"
    },
    {
        id: 2,
        title: "Dark Mode Enforcer",
        desc: "Forces dark mode on websites that don't natively support it using CSS injection.",
        category: "UI/UX",
        isTampermonkey: true,
        content: "// ==UserScript==\n// @name Dark Mode Enforcer\n// @match *://*/*\n// ==/UserScript==\nconst style = document.createElement('style');\nstyle.innerHTML = 'html { filter: invert(1) hue-rotate(180deg); } img { filter: invert(1) hue-rotate(180deg); }';\ndocument.head.appendChild(style);",
        url: "https://github.com"
    },
    {
        id: 3,
        title: "JSON Formatter",
        desc: "Prettifies raw JSON responses in the browser for better readability.",
        category: "Developer",
        isTampermonkey: false,
        content: "function formatJSON(json) { return JSON.stringify(JSON.parse(json), null, 2); }",
        url: "https://github.com"
    }
];

// --- STATE MANAGEMENT ---
let scripts = JSON.parse(localStorage.getItem('scripts')) || defaultScripts;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || ["Automation", "UI/UX", "Developer"];
let currentFilter = 'All';
let searchQuery = '';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let isLoginMode = true;

// --- INITIALIZATION ---
function init() {
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
    
    // Session upgrade for owner
    if (currentUser && currentUser.email === 'jvdb' && !currentUser.isOwner) {
        currentUser.isOwner = true;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    renderCategoryFilters();
    updateAuthUI();
    setupEventListeners();
    renderScripts();
    lucide.createIcons();
    setupScrollReveal();
}

function renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    const select = document.getElementById('scriptCategory');
    if (!container) return;

    // Update main filters
    const filterHtml = `
        <button class="filter-btn px-4 py-2 rounded-xl text-sm font-bold ${currentFilter === 'All' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}" data-category="All">All</button>
        ${categories.map(cat => `
            <button class="filter-btn px-4 py-2 rounded-xl text-sm font-bold ${currentFilter === cat ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}" data-category="${cat}">${cat}</button>
        `).join('')}
        <button class="filter-btn px-4 py-2 rounded-xl text-sm font-bold ${currentFilter === 'Favorites' ? 'bg-red-500 text-white' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'} flex items-center gap-2" data-category="Favorites">
            <i data-lucide="heart" class="w-4 h-4"></i> Favorites
        </button>
    `;
    container.innerHTML = filterHtml;

    // Update select in modal
    if (select) {
        select.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    // Re-attach listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            currentFilter = btn.dataset.category;
            renderCategoryFilters();
            renderScripts();
        };
    });
    lucide.createIcons();
}

function toggleCategoryManager() {
    const modal = document.getElementById('categoryModal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        renderCategoryManager();
    }
}

function renderCategoryManager() {
    const list = document.getElementById('categoryList');
    list.innerHTML = categories.map(cat => `
        <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <span class="font-medium">${cat}</span>
            <button onclick="deleteCategory('${cat}')" class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

function addCategory() {
    const input = document.getElementById('newCategoryInput');
    const name = input.value.trim();
    if (name && !categories.includes(name)) {
        categories.push(name);
        localStorage.setItem('categories', JSON.stringify(categories));
        input.value = '';
        renderCategoryManager();
        renderCategoryFilters();
        showToast(`Category "${name}" added`);
    }
}

function deleteCategory(name) {
    if (confirm(`Are you sure? Scripts in "${name}" will remain but the category will be removed from filters.`)) {
        categories = categories.filter(c => c !== name);
        localStorage.setItem('categories', JSON.stringify(categories));
        renderCategoryManager();
        renderCategoryFilters();
        showToast(`Category "${name}" removed`, 'info');
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    lucide.createIcons();
}

// --- AUTHENTICATION ---
function toggleLoginModal() {
    const modal = document.getElementById('loginModal');
    const content = modal.querySelector('div');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        content.classList.add('modal-enter');
    } else {
        modal.classList.add('hidden');
        content.classList.remove('modal-enter');
    }
}

function toggleDocsModal() {
    const modal = document.getElementById('docsModal');
    const content = modal.querySelector('div');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        content.classList.add('modal-enter');
    } else {
        modal.classList.add('hidden');
        content.classList.remove('modal-enter');
    }
}

// --- UI NOTIFICATIONS ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const icon = type === 'success' ? 'check-circle' : 'info';
    const color = type === 'success' ? 'text-emerald-500' : 'text-indigo-500';
    
    toast.className = `toast glass p-4 rounded-2xl shadow-xl flex items-center gap-3 min-w-[300px] border-l-4 ${type === 'success' ? 'border-emerald-500' : 'border-indigo-500'}`;
    toast.innerHTML = `
        <div class="${color}">
            <i data-lucide="${icon}" class="w-6 h-6"></i>
        </div>
        <div class="flex-1">
            <p class="text-sm font-bold">${message}</p>
        </div>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Auto remove
    const removeToast = () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    };
    
    const timeout = setTimeout(removeToast, 4000);
    
    toast.querySelector('button').onclick = () => {
        clearTimeout(timeout);
        removeToast();
    };
}

function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    // Owner check
    if (email === 'jvdb' && password === '978123') {
        currentUser = { email: 'jvdb', name: 'Owner', isOwner: true };
    } else {
        // Simple mock auth for others
        currentUser = { email: email, name: email.split('@')[0], isOwner: false };
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    toggleLoginModal();
    updateAuthUI();
    showToast(`Welcome back, ${currentUser.name}!`);
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showToast('Logged out successfully');
}

function updateAuthUI() {
    const container = document.getElementById('authContainer');
    if (!container) return;

    if (currentUser) {
        container.innerHTML = `
            <div class="flex items-center gap-4">
                ${currentUser.isOwner ? `
                    <button onclick="toggleOwnerModal()" class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                        <i data-lucide="layout-dashboard" class="w-4 h-4"></i> Dashboard
                    </button>
                ` : ''}
                <span class="text-sm font-medium hidden sm:block">Hi, ${currentUser.name}</span>
                <button onclick="handleLogout()" class="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
                    Logout
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="toggleLoginModal()" class="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none">
                Sign In
            </button>
        `;
    }
    lucide.createIcons();
}

// --- OWNER DASHBOARD LOGIC ---
function toggleOwnerModal() {
    const modal = document.getElementById('ownerModal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        renderOwnerDashboard();
    }
}

function renderOwnerDashboard() {
    const table = document.getElementById('ownerScriptTable');
    const totalScripts = document.getElementById('statsTotalScripts');
    const totalCategories = document.getElementById('statsTotalCategories');

    totalScripts.innerText = scripts.length;
    const categories = [...new Set(scripts.map(s => s.category))];
    totalCategories.innerText = categories.length;

    table.innerHTML = scripts.map(script => `
        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
            <td class="py-4 px-2 text-sm font-medium">${script.title}</td>
            <td class="py-4 px-2 text-sm text-slate-500">${script.category}</td>
            <td class="py-4 px-2 text-sm">
                <span class="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase">
                    ${script.isTampermonkey ? 'Tampermonkey' : 'Standard'}
                </span>
            </td>
            <td class="py-4 px-2 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="editScript(${script.id})" class="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-lg transition-colors">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteScript(${script.id})" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function toggleScriptFormModal() {
    const modal = document.getElementById('scriptFormModal');
    modal.classList.toggle('hidden');
}

function showAddScriptForm() {
    document.getElementById('scriptFormTitle').innerText = 'Add New Script';
    document.getElementById('editScriptId').value = '';
    document.getElementById('scriptForm').reset();
    toggleScriptFormModal();
}

function handleScriptSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('editScriptId').value;
    const title = document.getElementById('scriptTitle').value;
    const category = document.getElementById('scriptCategory').value;
    const desc = document.getElementById('scriptDesc').value;
    const url = document.getElementById('scriptUrl').value;
    const isTampermonkey = document.getElementById('scriptIsTampermonkey').checked;
    const content = document.getElementById('scriptContent').value;
    const tags = document.getElementById('scriptTags').value.split(',').map(t => t.trim()).filter(t => t);
    const previewUrl = document.getElementById('scriptPreviewUrl').value;

    if (id) {
        // Edit
        const index = scripts.findIndex(s => s.id == id);
        scripts[index] = { ...scripts[index], title, category, desc, url, isTampermonkey, content, tags, previewUrl };
        showToast('Script updated successfully');
    } else {
        // Add
        const newScript = {
            id: Date.now(),
            title,
            category,
            desc,
            url: url || 'https://github.com',
            isTampermonkey,
            content,
            tags,
            previewUrl,
            copyCount: 0
        };
        scripts.push(newScript);
        showToast('New script added');
    }

    localStorage.setItem('scripts', JSON.stringify(scripts));
    toggleScriptFormModal();
    renderOwnerDashboard();
    renderScripts();
}

function editScript(id) {
    const script = scripts.find(s => s.id == id);
    if (!script) return;

    document.getElementById('scriptFormTitle').innerText = 'Edit Script';
    document.getElementById('editScriptId').value = script.id;
    document.getElementById('scriptTitle').value = script.title;
    document.getElementById('scriptCategory').value = script.category;
    document.getElementById('scriptDesc').value = script.desc;
    document.getElementById('scriptUrl').value = script.url;
    document.getElementById('scriptIsTampermonkey').checked = script.isTampermonkey;
    document.getElementById('scriptContent').value = script.content;
    document.getElementById('scriptTags').value = (script.tags || []).join(', ');
    document.getElementById('scriptPreviewUrl').value = script.previewUrl || '';

    toggleScriptFormModal();
}

function deleteScript(id) {
    if (confirm('Are you sure you want to delete this script?')) {
        scripts = scripts.filter(s => s.id != id);
        localStorage.setItem('scripts', JSON.stringify(scripts));
        renderOwnerDashboard();
        renderScripts();
        showToast('Script deleted', 'info');
    }
}

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderScripts();
        });
    }

    // Explore Button
    const exploreBtn = document.getElementById('exploreBtn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            document.getElementById('scriptGridSection').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

function renderScripts() {
    const grid = document.getElementById('scriptGrid');
    if (!grid) return;

    const filtered = scripts.filter(script => {
        const matchesFilter = currentFilter === 'All' || 
                            (currentFilter === 'Favorites' ? favorites.includes(script.id) : script.category === currentFilter);
        const matchesSearch = script.title.toLowerCase().includes(searchQuery) || 
                            script.desc.toLowerCase().includes(searchQuery) ||
                            (script.tags && script.tags.some(t => t.toLowerCase().includes(searchQuery)));
        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <i data-lucide="search-x" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i>
                <p class="text-slate-500">No scripts found matching your criteria.</p>
            </div>
        `;
    } else {
        grid.innerHTML = filtered.map((script, index) => {
            const isFavorited = favorites.includes(script.id);
            const tags = script.tags || [];
            
            return `
                <div class="script-card glass rounded-3xl flex flex-col h-full stagger-card overflow-hidden" style="animation-delay: ${index * 0.1}s">
                    ${script.previewUrl ? `
                        <div class="h-40 w-full overflow-hidden relative group">
                            <img src="${script.previewUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onerror="this.style.display='none'">
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        </div>
                    ` : ''}
                    <div class="p-6 flex flex-col flex-grow">
                        <div class="flex justify-between items-start mb-4">
                            <div class="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                <i data-lucide="${script.isTampermonkey ? 'zap' : 'code'}" class="w-6 h-6"></i>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="toggleFavorite(${script.id})" class="p-2 rounded-xl ${isFavorited ? 'bg-red-50 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'} hover:scale-110 transition-all">
                                    <i data-lucide="heart" class="w-4 h-4 ${isFavorited ? 'fill-current' : ''}"></i>
                                </button>
                                <span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500">
                                    ${script.category}
                                </span>
                            </div>
                        </div>
                        <h3 class="text-xl font-bold mb-2">${script.title}</h3>
                        <p class="text-slate-600 dark:text-slate-400 text-sm mb-4 flex-grow">${script.desc}</p>
                        
                        ${tags.length > 0 ? `
                            <div class="flex flex-wrap gap-2 mb-6">
                                ${tags.map(tag => `<span class="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md">#${tag}</span>`).join('')}
                            </div>
                        ` : ''}

                        <div class="flex items-center justify-between mb-6 text-xs text-slate-400 font-medium">
                            <span class="flex items-center gap-1"><i data-lucide="copy" class="w-3 h-3"></i> ${script.copyCount || 0} copies</span>
                            <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${new Date(script.id).toLocaleDateString()}</span>
                        </div>

                        <div class="flex gap-3 mt-auto">
                            <button onclick="viewCode(${script.id})" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 click-scale">
                                <i data-lucide="eye" class="w-4 h-4"></i> View Code
                            </button>
                            <a href="${script.url}" target="_blank" class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors click-scale">
                                <i data-lucide="external-link" class="w-4 h-4"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    lucide.createIcons();
}

function toggleFavorite(id) {
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
        showToast('Removed from favorites', 'info');
    } else {
        favorites.push(id);
        showToast('Added to favorites');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderScripts();
}

function viewCode(id) {
    const script = scripts.find(s => s.id == id);
    if (!script) return;

    const modal = document.getElementById('viewCodeModal');
    const codeDisplay = document.getElementById('codeDisplay');
    const copyBtn = document.getElementById('copyCodeBtn');
    const title = document.getElementById('viewCodeTitle');

    title.innerText = script.title;
    codeDisplay.textContent = script.content;
    Prism.highlightElement(codeDisplay);

    copyBtn.onclick = () => {
        copyScript(script.id);
    };

    modal.classList.remove('hidden');
    modal.querySelector('div').classList.add('modal-enter');
}

function toggleViewCodeModal() {
    const modal = document.getElementById('viewCodeModal');
    modal.classList.add('hidden');
}

function copyScript(id) {
    const script = scripts.find(s => s.id === id);
    if (script) {
        navigator.clipboard.writeText(script.content).then(() => {
            // Increment copy count
            script.copyCount = (script.copyCount || 0) + 1;
            localStorage.setItem('scripts', JSON.stringify(scripts));
            renderScripts();
            showToast('Script copied to clipboard!');
        });
    }
}

function setupScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Run on load
document.addEventListener('DOMContentLoaded', init);