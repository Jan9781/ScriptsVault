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
let currentFilter = 'All';
let searchQuery = '';
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let isLoginMode = true;

// --- INITIALIZATION ---
function init() {
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
    
    updateAuthUI();
    setupEventListeners();
    renderScripts();
    lucide.createIcons();
    setupScrollReveal();
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

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleLink = document.getElementById('authToggle');

    if (isLoginMode) {
        title.innerText = 'Welcome Back';
        submitBtn.innerText = 'Sign In';
        toggleLink.innerText = 'Create Account';
    } else {
        title.innerText = 'Create Account';
        submitBtn.innerText = 'Sign Up';
        toggleLink.innerText = 'Sign In';
    }
}

function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    
    // Simple mock auth
    currentUser = { email: email, name: email.split('@')[0] };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    toggleLoginModal();
    updateAuthUI();
    showToast(`Welcome back, ${currentUser.name}!`);
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
}

function updateAuthUI() {
    const container = document.getElementById('authContainer');
    if (!container) return;

    if (currentUser) {
        container.innerHTML = `
            <div class="flex items-center gap-4">
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

    // Filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.getAttribute('data-category');
            
            // Update UI
            filterBtns.forEach(b => {
                b.classList.remove('bg-indigo-600', 'text-white');
                b.classList.add('bg-white', 'dark:bg-slate-900', 'border', 'border-slate-200', 'dark:border-slate-800');
            });
            btn.classList.add('bg-indigo-600', 'text-white');
            btn.classList.remove('bg-white', 'dark:bg-slate-900', 'border', 'border-slate-200', 'dark:border-slate-800');
            
            renderScripts();
        });
    });

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
        const matchesFilter = currentFilter === 'All' || script.category === currentFilter;
        const matchesSearch = script.title.toLowerCase().includes(searchQuery) || 
                            script.desc.toLowerCase().includes(searchQuery);
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
        grid.innerHTML = filtered.map(script => `
            <div class="script-card glass p-6 rounded-3xl flex flex-col h-full reveal active">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                        <i data-lucide="${script.isTampermonkey ? 'zap' : 'code'}" class="w-6 h-6"></i>
                    </div>
                    <span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500">
                        ${script.category}
                    </span>
                </div>
                <h3 class="text-xl font-bold mb-2">${script.title}</h3>
                <p class="text-slate-600 dark:text-slate-400 text-sm mb-6 flex-grow">${script.desc}</p>
                <div class="flex gap-3 mt-auto">
                    <button onclick="copyScript(${script.id})" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                        <i data-lucide="copy" class="w-4 h-4"></i> Copy Code
                    </button>
                    <a href="${script.url}" target="_blank" class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

function copyScript(id) {
    const script = scripts.find(s => s.id === id);
    if (script) {
        navigator.clipboard.writeText(script.content).then(() => {
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