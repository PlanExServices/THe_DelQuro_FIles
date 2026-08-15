/* ============================================
   THE DELQURO FILES — App Logic
   Zero dependencies. Pure JS. localStorage.
   ============================================ */

// ========== DATA LAYER ==========
const DB = {
  _key: 'delquro-files',
  
  _defaults() {
    return {
      ideas: [],
      projects: [],
      activity: [],
      tags: ['feature', 'bug', 'design', 'improvement'],
      meta: {
        created: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (!raw) {
        const data = this._defaults();
        this.save(data);
        return data;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('DB load error:', e);
      return this._defaults();
    }
  },

  save(data) {
    try {
      localStorage.setItem(this._key, JSON.stringify(data));
    } catch (e) {
      console.error('DB save error:', e);
      toast('⚠️ Storage full — export & clear some data');
    }
  },

  get data() {
    if (!this._cache) this._cache = this.load();
    return this._cache;
  },

  commit() {
    this.save(this.data);
  }
};

// ========== UTILITIES ==========
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const secs = Math.floor(diff / 1000);
  
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toast(message) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ========== ACTIVITY LOG ==========
function logActivity(type, text) {
  const entry = {
    id: uid(),
    type, // 'idea', 'project', 'system', 'delete'
    text,
    timestamp: new Date().toISOString()
  };
  DB.data.activity.unshift(entry);
  // Keep last 200 entries
  if (DB.data.activity.length > 200) {
    DB.data.activity = DB.data.activity.slice(0, 200);
  }
  DB.commit();
  renderActivity();
  updateCounts();
}

// ========== IDEAS ==========
function addIdea(text, tags = []) {
  if (!text.trim()) return;
  
  const idea = {
    id: uid(),
    text: text.trim(),
    tags,
    created: new Date().toISOString()
  };
  
  DB.data.ideas.unshift(idea);
  
  // Add any new tags to global tag list
  tags.forEach(t => {
    if (!DB.data.tags.includes(t)) {
      DB.data.tags.push(t);
    }
  });
  
  DB.commit();
  logActivity('idea', `Captured idea: <strong>"${escapeHtml(text.trim().slice(0, 60))}${text.trim().length > 60 ? '...' : ''}"</strong>`);
  renderIdeas();
  updateCounts();
  renderFilterBar();
  scheduleSync();
  toast('💡 Idea saved!');
}

function deleteIdea(id) {
  const idea = DB.data.ideas.find(i => i.id === id);
  if (!idea) return;
  
  DB.data.ideas = DB.data.ideas.filter(i => i.id !== id);
  DB.commit();
  logActivity('delete', `Deleted idea: "${escapeHtml(idea.text.slice(0, 50))}"`);
  renderIdeas();
  updateCounts();
  scheduleSync();
  toast('🗑️ Idea deleted');
}

// ========== PROJECTS ==========
function addProject(data) {
  const project = {
    id: uid(),
    name: data.name.trim(),
    description: data.description.trim(),
    status: data.status || 'idea',
    arenaUrl: data.arenaUrl.trim(),
    githubUrl: data.githubUrl.trim(),
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  DB.data.projects.unshift(project);
  DB.commit();
  logActivity('project', `Created project: <strong>${escapeHtml(project.name)}</strong>`);
  renderProjects();
  updateCounts();
  scheduleSync();
  toast('📁 Project created!');
  return project;
}

function updateProject(id, data) {
  const idx = DB.data.projects.findIndex(p => p.id === id);
  if (idx === -1) return;
  
  const old = DB.data.projects[idx];
  DB.data.projects[idx] = {
    ...old,
    name: data.name.trim(),
    description: data.description.trim(),
    status: data.status,
    arenaUrl: data.arenaUrl.trim(),
    githubUrl: data.githubUrl.trim(),
    updated: new Date().toISOString()
  };
  
  DB.commit();
  logActivity('project', `Updated project: <strong>${escapeHtml(data.name)}</strong>`);
  renderProjects();
  scheduleSync();
  toast('✅ Project updated');
}

function deleteProject(id) {
  const project = DB.data.projects.find(p => p.id === id);
  if (!project) return;
  
  DB.data.projects = DB.data.projects.filter(p => p.id !== id);
  DB.commit();
  logActivity('delete', `Deleted project: <strong>${escapeHtml(project.name)}</strong>`);
  renderProjects();
  updateCounts();
  scheduleSync();
  toast('🗑️ Project deleted');
}

// ========== RENDERING ==========
function renderIdeas(filter = null, search = '') {
  const list = document.getElementById('ideas-list');
  const empty = document.getElementById('ideas-empty');
  const countLabel = document.getElementById('ideas-count-label');
  
  let ideas = DB.data.ideas;
  
  // Apply tag filter
  if (filter && filter !== 'all') {
    ideas = ideas.filter(i => i.tags.includes(filter));
  }
  
  // Apply search
  if (search) {
    const q = search.toLowerCase();
    ideas = ideas.filter(i => 
      i.text.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  
  countLabel.textContent = `${ideas.length} idea${ideas.length !== 1 ? 's' : ''}`;
  
  if (ideas.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  list.innerHTML = ideas.map(idea => `
    <div class="idea-card" data-id="${idea.id}">
      <div class="idea-card-header">
        <div class="idea-text">${escapeHtml(idea.text)}</div>
        <div class="idea-actions">
          <button class="idea-action-btn delete" onclick="deleteIdea('${idea.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="idea-meta">
        <span class="idea-time" title="${formatDate(idea.created)}">${timeAgo(idea.created)}</span>
        ${idea.tags.length ? `
          <div class="idea-tags">
            ${idea.tags.map(t => `<span class="idea-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function renderProjects(search = '') {
  const list = document.getElementById('projects-list');
  const empty = document.getElementById('projects-empty');
  
  let projects = DB.data.projects;
  
  if (search) {
    const q = search.toLowerCase();
    projects = projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.status.includes(q)
    );
  }
  
  // Update stats
  document.getElementById('stat-total').textContent = DB.data.projects.length;
  document.getElementById('stat-active').textContent = DB.data.projects.filter(p => p.status === 'active').length;
  document.getElementById('stat-completed').textContent = DB.data.projects.filter(p => p.status === 'completed').length;
  
  if (projects.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  list.innerHTML = projects.map(p => `
    <div class="project-card" data-id="${p.id}">
      <div class="project-card-header">
        <div class="project-name">${escapeHtml(p.name)}</div>
        <span class="project-status status-${p.status}">
          <span class="status-dot"></span>
          ${p.status}
        </span>
      </div>
      ${p.description ? `<div class="project-desc">${escapeHtml(p.description)}</div>` : ''}
      <div class="project-links">
        ${p.arenaUrl ? `<a href="${escapeHtml(p.arenaUrl)}" target="_blank" rel="noopener" class="project-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Arena.ai
        </a>` : ''}
        ${p.githubUrl ? `<a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener" class="project-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          GitHub
        </a>` : ''}
      </div>
      <div class="project-footer">
        <span class="project-date">Updated ${timeAgo(p.updated)}</span>
        <div class="project-actions">
          <button class="idea-action-btn" onclick="editProject('${p.id}')" title="Edit">✎</button>
          <button class="idea-action-btn delete" onclick="deleteProject('${p.id}')" title="Delete">✕</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderActivity() {
  const list = document.getElementById('activity-list');
  const empty = document.getElementById('activity-empty');
  
  const activity = DB.data.activity;
  
  if (activity.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  
  empty.classList.add('hidden');
  
  const iconMap = {
    idea: '💡',
    project: '📁',
    system: '⚙️',
    delete: '🗑️'
  };
  
  list.innerHTML = activity.slice(0, 100).map(a => `
    <div class="activity-item">
      <div class="activity-icon ${a.type}">${iconMap[a.type] || '•'}</div>
      <div class="activity-content">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${formatDate(a.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  const allTags = new Set();
  DB.data.ideas.forEach(i => i.tags.forEach(t => allTags.add(t)));
  
  let html = '<button class="filter-tag active" data-filter="all">All</button>';
  allTags.forEach(t => {
    html += `<button class="filter-tag" data-filter="${escapeHtml(t)}">${escapeHtml(t)}</button>`;
  });
  bar.innerHTML = html;
  
  // Re-attach listeners
  bar.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const search = document.getElementById('search-input').value;
      renderIdeas(filter === 'all' ? null : filter, search);
    });
  });
}

function renderCaptureTags() {
  const container = document.getElementById('capture-tags');
  const tags = DB.data.tags.slice(0, 6); // Show max 6 preset tags
  
  // Keep the input wrap, rebuild tags
  const inputWrap = container.querySelector('.tag-input-wrap');
  container.innerHTML = '';
  
  tags.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.dataset.tag = t;
    el.textContent = t;
    el.addEventListener('click', () => el.classList.toggle('selected'));
    container.appendChild(el);
  });
  
  container.appendChild(inputWrap || createTagInput());
}

function createTagInput() {
  const wrap = document.createElement('div');
  wrap.className = 'tag-input-wrap';
  wrap.innerHTML = '<input type="text" class="tag-input" id="tag-input" placeholder="+ tag">';
  
  const input = wrap.querySelector('input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      const tag = input.value.trim().toLowerCase();
      // Add as selected tag pill
      const pill = document.createElement('div');
      pill.className = 'tag selected';
      pill.dataset.tag = tag;
      pill.textContent = tag;
      pill.addEventListener('click', () => pill.classList.toggle('selected'));
      wrap.before(pill);
      input.value = '';
    }
  });
  
  return wrap;
}

function updateCounts() {
  document.getElementById('count-ideas').textContent = DB.data.ideas.length;
  document.getElementById('count-projects').textContent = DB.data.projects.length;
  document.getElementById('count-activity').textContent = DB.data.activity.length;
}

// ========== NAVIGATION ==========
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  
  document.getElementById(`view-${viewName}`).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
  
  // Show/hide FAB based on view
  const fab = document.getElementById('fab');
  fab.style.display = viewName === 'ideas' ? 'flex' : 'none';
  
  // Render settings if switching to it
  if (viewName === 'settings') renderSettings();
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== EXPORT / IMPORT ==========
function exportData() {
  const data = DB.data;
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `delquro-files-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  logActivity('system', 'Exported all data as JSON backup');
  toast('📦 Data exported!');
}

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    
    // Validate structure
    if (!data.ideas || !Array.isArray(data.ideas)) {
      throw new Error('Invalid format: missing ideas array');
    }
    
    // Merge or replace
    const mode = confirm('OK = Replace all data\nCancel = Merge with existing') ? 'replace' : 'merge';
    
    if (mode === 'replace') {
      DB.data.ideas = data.ideas || [];
      DB.data.projects = data.projects || [];
      DB.data.activity = data.activity || [];
      DB.data.tags = data.tags || DB._defaults().tags;
    } else {
      // Merge: add items that don't exist by id
      const existingIdeaIds = new Set(DB.data.ideas.map(i => i.id));
      (data.ideas || []).forEach(i => {
        if (!existingIdeaIds.has(i.id)) DB.data.ideas.push(i);
      });
      
      const existingProjectIds = new Set(DB.data.projects.map(p => p.id));
      (data.projects || []).forEach(p => {
        if (!existingProjectIds.has(p.id)) DB.data.projects.push(p);
      });
      
      const existingActivityIds = new Set(DB.data.activity.map(a => a.id));
      (data.activity || []).forEach(a => {
        if (!existingActivityIds.has(a.id)) DB.data.activity.push(a);
      });
      
      // Sort by date
      DB.data.ideas.sort((a, b) => new Date(b.created) - new Date(a.created));
      DB.data.projects.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    }
    
    DB.commit();
    renderAll();
    logActivity('system', `Imported data (${mode} mode): ${data.ideas?.length || 0} ideas, ${data.projects?.length || 0} projects`);
    toast(`✅ Data imported! (${mode})`);
    return true;
  } catch (e) {
    toast('❌ Import failed: ' + e.message);
    return false;
  }
}

// ========== PROJECT EDIT ==========
function editProject(id) {
  const project = DB.data.projects.find(p => p.id === id);
  if (!project) return;
  
  const form = document.getElementById('add-project-form');
  form.classList.remove('hidden');
  document.getElementById('form-title').textContent = 'Edit Project';
  document.getElementById('edit-project-id').value = id;
  document.getElementById('proj-name').value = project.name;
  document.getElementById('proj-desc').value = project.description;
  document.getElementById('proj-status').value = project.status;
  document.getElementById('proj-arena').value = project.arenaUrl;
  document.getElementById('proj-github').value = project.githubUrl;
  
  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== RENDER ALL ==========
function renderAll() {
  renderIdeas();
  renderProjects();
  renderActivity();
  renderFilterBar();
  renderCaptureTags();
  updateCounts();
}

// ========== EVENT LISTENERS ==========
function initEvents() {
  // Navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
  
  // Save idea
  const ideaInput = document.getElementById('idea-input');
  const btnSaveIdea = document.getElementById('btn-save-idea');
  
  btnSaveIdea.addEventListener('click', () => {
    const text = ideaInput.value;
    if (!text.trim()) return;
    
    // Collect selected tags
    const tags = [];
    document.querySelectorAll('#capture-tags .tag.selected').forEach(t => {
      tags.push(t.dataset.tag);
    });
    
    addIdea(text, tags);
    ideaInput.value = '';
    
    // Deselect tags
    document.querySelectorAll('#capture-tags .tag.selected').forEach(t => {
      t.classList.remove('selected');
    });
    
    ideaInput.focus();
  });
  
  // Ctrl+Enter to save idea
  ideaInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      btnSaveIdea.click();
    }
  });
  
  // Auto-resize textarea
  ideaInput.addEventListener('input', () => {
    ideaInput.style.height = 'auto';
    ideaInput.style.height = Math.min(ideaInput.scrollHeight, 200) + 'px';
  });
  
  // Tag input
  const tagInput = document.getElementById('tag-input');
  if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim()) {
        e.preventDefault();
        const tag = tagInput.value.trim().toLowerCase();
        const container = document.getElementById('capture-tags');
        const inputWrap = container.querySelector('.tag-input-wrap');
        
        const pill = document.createElement('div');
        pill.className = 'tag selected';
        pill.dataset.tag = tag;
        pill.textContent = tag;
        pill.addEventListener('click', () => pill.classList.toggle('selected'));
        inputWrap.before(pill);
        tagInput.value = '';
      }
    });
  }
  
  // Search
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = searchInput.value;
      const activeView = document.querySelector('.nav-tab.active').dataset.view;
      
      if (activeView === 'ideas') {
        const activeFilter = document.querySelector('.filter-tag.active')?.dataset.filter;
        renderIdeas(activeFilter === 'all' ? null : activeFilter, q);
      } else if (activeView === 'projects') {
        renderProjects(q);
      }
    }, 200);
  });
  
  // FAB
  document.getElementById('fab').addEventListener('click', () => {
    switchView('ideas');
    setTimeout(() => ideaInput.focus(), 300);
  });
  
  // Project form
  document.getElementById('btn-show-add-project').addEventListener('click', () => {
    const form = document.getElementById('add-project-form');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
      document.getElementById('form-title').textContent = 'New Project';
      document.getElementById('edit-project-id').value = '';
      document.getElementById('proj-name').focus();
    }
  });
  
  document.getElementById('btn-cancel-project').addEventListener('click', () => {
    document.getElementById('add-project-form').classList.add('hidden');
    clearProjectForm();
  });
  
  document.getElementById('btn-save-project').addEventListener('click', () => {
    const name = document.getElementById('proj-name').value;
    if (!name.trim()) {
      toast('⚠️ Project name is required');
      return;
    }
    
    const data = {
      name,
      description: document.getElementById('proj-desc').value,
      status: document.getElementById('proj-status').value,
      arenaUrl: document.getElementById('proj-arena').value,
      githubUrl: document.getElementById('proj-github').value
    };
    
    const editId = document.getElementById('edit-project-id').value;
    if (editId) {
      updateProject(editId, data);
    } else {
      addProject(data);
    }
    
    document.getElementById('add-project-form').classList.add('hidden');
    clearProjectForm();
  });
  
  // Export
  document.getElementById('btn-export').addEventListener('click', exportData);
  
  // Import
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-modal').classList.remove('hidden');
  });
  
  document.getElementById('btn-close-import').addEventListener('click', () => {
    document.getElementById('import-modal').classList.add('hidden');
  });
  
  document.getElementById('btn-cancel-import').addEventListener('click', () => {
    document.getElementById('import-modal').classList.add('hidden');
  });
  
  document.getElementById('btn-do-import').addEventListener('click', () => {
    const textArea = document.getElementById('import-text');
    const fileInput = document.getElementById('import-file');
    
    if (fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (importData(e.target.result)) {
          document.getElementById('import-modal').classList.add('hidden');
          textArea.value = '';
          fileInput.value = '';
        }
      };
      reader.readAsText(fileInput.files[0]);
    } else if (textArea.value.trim()) {
      if (importData(textArea.value)) {
        document.getElementById('import-modal').classList.add('hidden');
        textArea.value = '';
      }
    } else {
      toast('⚠️ Paste JSON or select a file');
    }
  });
  
  // Clear activity log
  document.getElementById('btn-clear-log').addEventListener('click', () => {
    if (confirm('Clear all activity log entries?')) {
      DB.data.activity = [];
      DB.commit();
      renderActivity();
      updateCounts();
      toast('📋 Log cleared');
    }
  });
  
  // Close modal on overlay click
  document.getElementById('import-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });
}

function clearProjectForm() {
  document.getElementById('edit-project-id').value = '';
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-desc').value = '';
  document.getElementById('proj-status').value = 'idea';
  document.getElementById('proj-arena').value = '';
  document.getElementById('proj-github').value = '';
}

// ========== KEYBOARD SHORTCUTS ==========
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Alt+1/2/3 for tab switching
    if (e.altKey) {
      if (e.key === '1') { e.preventDefault(); switchView('ideas'); }
      if (e.key === '2') { e.preventDefault(); switchView('projects'); }
      if (e.key === '3') { e.preventDefault(); switchView('activity'); }
      if (e.key === '4') { e.preventDefault(); switchView('settings'); }
    }
    
    // Alt+N for new idea
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      switchView('ideas');
      setTimeout(() => document.getElementById('idea-input').focus(), 100);
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
      document.getElementById('import-modal').classList.add('hidden');
    }
  });
}

// ========== GITHUB SYNC (Gist) ==========
const GistSync = {
  _tokenKey: 'delquro-gh-token',
  _gistKey: 'delquro-gh-gist',
  _lastSyncKey: 'delquro-last-sync',
  _filename: 'delquro-files-data.json',

  // Simple obfuscation for token storage (not real encryption, just not plaintext)
  _obfuscate(str) {
    return btoa(encodeURIComponent(str).split('').reverse().join(''));
  },

  _deobfuscate(str) {
    try {
      return decodeURIComponent(atob(str).split('').reverse().join(''));
    } catch { return null; }
  },

  getToken() {
    const raw = localStorage.getItem(this._tokenKey);
    if (!raw) return null;
    return this._deobfuscate(raw);
  },

  setToken(token) {
    localStorage.setItem(this._tokenKey, this._obfuscate(token));
  },

  clearToken() {
    localStorage.removeItem(this._tokenKey);
    localStorage.removeItem(this._gistKey);
    localStorage.removeItem(this._lastSyncKey);
  },

  getGistId() {
    return localStorage.getItem(this._gistKey);
  },

  setGistId(id) {
    localStorage.setItem(this._gistKey, id);
  },

  getLastSync() {
    const ts = localStorage.getItem(this._lastSyncKey);
    return ts ? new Date(ts) : null;
  },

  setLastSync() {
    localStorage.setItem(this._lastSyncKey, new Date().toISOString());
  },

  isConnected() {
    return !!this.getToken() && !!this.getGistId();
  },

  async _fetch(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${token}`,
      ...(options.headers || {})
    };
    
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
      throw new Error('Token invalid or expired. Please reconnect.');
    }
    if (res.status === 404) {
      throw new Error('Gist not found. It may have been deleted.');
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API error (${res.status}): ${body.slice(0, 200)}`);
    }
    
    return res.json();
  },

  // Create a new private Gist for data storage
  async createGist() {
    const data = JSON.stringify(DB.data, null, 2);
    
    const res = await this._fetch('https://api.github.com/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: 'DelQuro Files — App Data (auto-synced)',
        public: false,
        files: {
          [this._filename]: { content: data }
        }
      })
    });
    
    this.setGistId(res.id);
    logActivity('system', `🔗 Created sync Gist: <code>${res.id.slice(0, 8)}...</code>`);
    return res;
  },

  // Push local data to Gist
  async push() {
    if (!this.getToken()) throw new Error('Not connected to GitHub');
    
    let gistId = this.getGistId();
    
    // Create Gist if none exists
    if (!gistId) {
      const gist = await this.createGist();
      gistId = gist.id;
    }
    
    // Update the Gist
    const data = JSON.stringify(DB.data, null, 2);
    
    await this._fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        files: {
          [this._filename]: { content: data }
        }
      })
    });
    
    this.setLastSync();
    return true;
  },

  // Pull data from Gist to local
  async pull() {
    if (!this.isConnected()) throw new Error('Not connected to GitHub');
    
    const gistId = this.getGistId();
    const gist = await this._fetch(`https://api.github.com/gists/${gistId}`);
    
    const file = gist.files[this._filename];
    if (!file) throw new Error('Data file not found in Gist');
    
    const remoteData = JSON.parse(file.content);
    
    // Merge: remote wins for conflicts, local items kept if not in remote
    this._mergeData(remoteData);
    DB.commit();
    this.setLastSync();
    
    renderAll();
    return remoteData;
  },

  // Smart merge: remote items take priority, local-only items preserved
  _mergeData(remote) {
    const local = DB.data;
    
    // Ideas: merge by id, remote wins
    const localIdeaMap = new Map(local.ideas.map(i => [i.id, i]));
    (remote.ideas || []).forEach(i => localIdeaMap.set(i.id, i));
    local.ideas = [...localIdeaMap.values()].sort((a, b) => new Date(b.created) - new Date(a.created));
    
    // Projects: merge by id, remote wins
    const localProjMap = new Map(local.projects.map(p => [p.id, p]));
    (remote.projects || []).forEach(p => localProjMap.set(p.id, p));
    local.projects = [...localProjMap.values()].sort((a, b) => new Date(b.updated) - new Date(a.updated));
    
    // Activity: combine and dedupe
    const localActMap = new Map(local.activity.map(a => [a.id, a]));
    (remote.activity || []).forEach(a => localActMap.set(a.id, a));
    local.activity = [...localActMap.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 200);
    
    // Tags: combine
    const allTags = new Set([...local.tags, ...(remote.tags || [])]);
    local.tags = [...allTags];
  },

  // Full sync: pull then push
  async sync() {
    if (!this.isConnected()) throw new Error('Not connected');
    
    try {
      await this.pull();
      await this.push();
      this.setLastSync();
      logActivity('system', '🔄 Sync completed successfully');
      return true;
    } catch (e) {
      logActivity('system', `❌ Sync failed: ${e.message}`);
      throw e;
    }
  },

  // Verify token works by fetching user info
  async verifyToken() {
    try {
      const user = await this._fetch('https://api.github.com/user');
      return user;
    } catch {
      return null;
    }
  }
};

// ========== SETTINGS UI ==========
function renderSettings() {
  const connected = GistSync.isConnected();
  const elConnected = document.getElementById('github-connected');
  const elDisconnected = document.getElementById('github-disconnected');
  
  if (connected) {
    elConnected.classList.remove('hidden');
    elDisconnected.classList.add('hidden');
    document.getElementById('gist-id-display').textContent = GistSync.getGistId()?.slice(0, 12) + '...';
    
    const lastSync = GistSync.getLastSync();
    document.getElementById('last-sync-time').textContent = lastSync ? timeAgo(lastSync.toISOString()) : 'Never';
  } else {
    elConnected.classList.add('hidden');
    elDisconnected.classList.remove('hidden');
  }
}

function initSettings() {
  // Connect GitHub
  document.getElementById('btn-connect-github').addEventListener('click', async () => {
    const token = document.getElementById('github-token').value.trim();
    if (!token) {
      toast('⚠️ Enter your GitHub token');
      return;
    }
    
    const btn = document.getElementById('btn-connect-github');
    btn.textContent = 'Connecting...';
    btn.disabled = true;
    
    GistSync.setToken(token);
    
    // Verify the token
    const user = await GistSync.verifyToken();
    
    if (!user) {
      GistSync.clearToken();
      btn.textContent = 'Connect GitHub';
      btn.disabled = false;
      toast('❌ Invalid token. Check and try again.');
      return;
    }
    
    // Create initial Gist
    try {
      await GistSync.createGist();
      await GistSync.push();
      
      logActivity('system', `🔗 Connected as <strong>${escapeHtml(user.login)}</strong> — data syncing to Gist`);
      toast(`✅ Connected as ${user.login}!`);
      
      document.getElementById('github-token').value = '';
      renderSettings();
    } catch (e) {
      GistSync.clearToken();
      toast('❌ Connection failed: ' + e.message);
    }
    
    btn.textContent = 'Connect GitHub';
    btn.disabled = false;
  });
  
  // Disconnect
  document.getElementById('btn-disconnect').addEventListener('click', () => {
    if (confirm('Disconnect GitHub? Local data stays, but sync stops.')) {
      GistSync.clearToken();
      logActivity('system', '🔌 Disconnected from GitHub');
      renderSettings();
      toast('Disconnected from GitHub');
    }
  });
  
  // Sync now
  document.getElementById('btn-sync-now').addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-now');
    btn.textContent = '⏳ Syncing...';
    btn.disabled = true;
    
    try {
      await GistSync.sync();
      toast('✅ Synced!');
      renderSettings();
    } catch (e) {
      toast('❌ ' + e.message);
    }
    
    btn.textContent = '🔄 Sync Now';
    btn.disabled = false;
  });
  
  // Export/Import from settings
  document.getElementById('btn-export-settings').addEventListener('click', exportData);
  document.getElementById('btn-import-settings').addEventListener('click', () => {
    document.getElementById('import-modal').classList.remove('hidden');
  });
  
  // Clear all data
  document.getElementById('btn-clear-all').addEventListener('click', () => {
    if (confirm('⚠️ Delete ALL local data? This cannot be undone!\n\n(Tip: Export first if you want a backup)')) {
      if (confirm('Are you really sure? Everything will be gone.')) {
        DB.data.ideas = [];
        DB.data.projects = [];
        DB.data.activity = [];
        DB.data.tags = ['feature', 'bug', 'design', 'improvement'];
        DB.commit();
        
        logActivity('system', '🗑️ All data cleared by user');
        renderAll();
        renderSettings();
        toast('🗑️ All data cleared');
      }
    }
  });
}

// Auto-sync on changes (debounced)
let syncTimeout;
function scheduleSync() {
  if (!GistSync.isConnected()) return;
  
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await GistSync.push();
      renderSettings();
    } catch (e) {
      console.warn('Auto-sync failed:', e.message);
    }
  }, 3000); // 3 second debounce
}

// ========== INIT ==========
function init() {
  // Load data (creates defaults if first run)
  const data = DB.data;
  
  // Log first-run if new
  if (data.activity.length === 0) {
    logActivity('system', '🚀 <strong>The DelQuro Files</strong> initialized — ready to capture!');
    logActivity('system', '💡 Tip: Press Alt+N for quick capture, Alt+1/2/3/4 to switch tabs');
  }
  
  // Render everything
  renderAll();
  
  // Bind events
  initEvents();
  initShortcuts();
  initSettings();
  
  // Make delete functions global for onclick handlers
  window.deleteIdea = deleteIdea;
  window.deleteProject = deleteProject;
  window.editProject = editProject;
  
  // Auto-pull from GitHub on startup if connected
  if (GistSync.isConnected()) {
    setTimeout(async () => {
      try {
        await GistSync.pull();
        logActivity('system', '🔄 Auto-synced from GitHub on startup');
        toast('🔄 Data synced from cloud');
      } catch (e) {
        console.warn('Startup sync failed:', e.message);
      }
    }, 1000);
  }
  
  console.log('%c DelQuro Files v1.1.0 ', 'background: #6c5ce7; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
  console.log('Ready. Alt+N = new idea, Alt+1/2/3/4 = switch tabs, GitHub sync enabled');
}

// Go!
document.addEventListener('DOMContentLoaded', init);
