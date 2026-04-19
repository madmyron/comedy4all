/**
 * Projects Management for C4A
 */

let selectedProjectId = null;
let editingProjectId = null;

async function loadProjects() {
  const listEl = document.getElementById('projects-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">Loading projects...</div>';

  if (!currentUser || !_sb) return;

  try {
    // Fetch projects
    const { data: projects, error } = await _sb
      .from('projects')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!projects || projects.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">No projects found. Create one to get started!</div>';
      return;
    }

    // To avoid N+1 queries, we fetch all related items for the user and count them in JS
    const [scriptsRes, convosRes, filesRes] = await Promise.all([
      _sb.from('scripts').select('project_id').eq('user_id', currentUser.id),
      _sb.from('brooks_conversations').select('project_id').eq('user_id', currentUser.id),
      _sb.from('project_files').select('project_id').eq('user_id', currentUser.id)
    ]);

    const scripts = scriptsRes.data || [];
    const convos = convosRes.data || [];
    const files = filesRes.data || [];

    listEl.innerHTML = '';
    
    projects.forEach(proj => {
      const sCount = scripts.filter(s => s.project_id === proj.id).length;
      const cCount = convos.filter(c => c.project_id === proj.id).length;
      const fCount = files.filter(f => f.project_id === proj.id).length;

      const card = document.createElement('div');
      card.className = 'card';
      card.style.cursor = 'pointer';
      card.onclick = () => openProject(proj.id);
      
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="font-weight:600;font-size:15px;color:var(--text)">${proj.name}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="event.stopPropagation(); editProject('${proj.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteProject('${proj.id}')">Delete</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.5">${proj.description || 'No description provided.'}</div>
        <div style="display:flex;gap:12px;font-size:11px;color:var(--text3)">
          <div style="display:flex;align-items:center;gap:4px">📝 ${sCount} scripts</div>
          <div style="display:flex;align-items:center;gap:4px">💬 ${cCount} convos</div>
          <div style="display:flex;align-items:center;gap:4px">📄 ${fCount} files</div>
        </div>
      `;
      listEl.appendChild(card);
    });

  } catch (err) {
    console.error('Error loading projects:', err);
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red);font-size:13px">Error loading projects. Please try again.</div>';
  }
}

function createProject() {
  editingProjectId = null;
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-desc').value = '';
  document.getElementById('project-modal').style.display = 'flex';
}

async function saveProject() {
  const name = document.getElementById('proj-name').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();

  if (!name) {
    toast('Project name is required');
    return;
  }

  if (!currentUser || !_sb) return;

  try {
    if (editingProjectId) {
      const { error } = await _sb
        .from('projects')
        .update({ name, description: desc, updated_at: new Date().toISOString() })
        .eq('id', editingProjectId);
      if (error) throw error;
      toast('Project updated');
    } else {
      const { error } = await _sb
        .from('projects')
        .insert([{ user_id: currentUser.id, name, description: desc }]);
      if (error) throw error;
      toast('Project created');
    }

    closeProjectModal();
    loadProjects();
  } catch (err) {
    console.error('Error saving project:', err);
    toast('Error saving project');
  }
}

async function editProject(id) {
  try {
    const { data: proj, error } = await _sb
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;

    editingProjectId = id;
    document.getElementById('proj-name').value = proj.name;
    document.getElementById('proj-desc').value = proj.description || '';
    document.getElementById('project-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error fetching project for edit:', err);
    toast('Error loading project details');
  }
}

async function deleteProject(id) {
  if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

  try {
    const { error } = await _sb
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast('Project deleted');
    loadProjects();
  } catch (err) {
    console.error('Error deleting project:', err);
    toast('Error deleting project');
  }
}

async function openProject(id) {
  selectedProjectId = id;
  const listEl = document.getElementById('projects-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">Loading project details...</div>';

  try {
    const { data: proj, error: projErr } = await _sb.from('projects').select('*').eq('id', id).single();
    if (projErr) throw projErr;

    const [filesRes, convosRes, scriptsRes] = await Promise.all([
      _sb.from('project_files').select('*').eq('project_id', id),
      _sb.from('brooks_conversations').select('*').eq('project_id', id),
      _sb.from('studio_scripts').select('*').eq('project_id', id)
    ]);

    renderProjectDetails(proj, filesRes.data || [], convosRes.data || [], scriptsRes.data || []);
  } catch (err) {
    console.error('Error opening project:', err);
    toast('Error loading project details');
    loadProjects();
  }
}

function renderProjectDetails(proj, files, convos, scripts) {
  const listEl = document.getElementById('projects-list');
  if (!listEl) return;

  listEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <button class="btn" onclick="loadProjects()" style="align-self:flex-start;margin-bottom:10px">← Back to Projects</button>
      
      <div class="card" style="background:var(--bg2)">
        <div style="display:flex;flex-direction:column;gap:10px">
          <input type="text" id="det-proj-name" value="${proj.name}" 
            style="font-size:22px;font-weight:700;background:transparent;border:1px solid transparent;color:var(--text);outline:none;width:100%" 
            onblur="updateProjectBasicInfo('${proj.id}', this.value, document.getElementById('det-proj-desc').value)">
          <textarea id="det-proj-desc" 
            style="font-size:14px;background:transparent;border:1px solid transparent;color:var(--text2);outline:none;width:100%;resize:vertical" 
            onblur="updateProjectBasicInfo('${proj.id}', document.getElementById('det-proj-name').value, this.value)">${proj.description || ''}</textarea>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px">
        <!-- Section A: Project Files -->
        <div class="card">
          <div class="ctitle">Project Files 
            <div style="display:flex;gap:5px">
              <button class="btn btn-sm" onclick="showFileAddDropdown()">+ Add File</button>
              <button class="btn btn-sm" onclick="document.getElementById('proj-file-upload').click()">Upload .txt</button>
              <input type="file" id="proj-file-upload" style="display:none" accept=".txt" onchange="handleProjectFileUpload(event)">
            </div>
          </div>
          <div id="file-add-dropdown" style="display:none;position:absolute;background:var(--bg2);border:1px solid var(--border);border-radius:8px;z-index:10;box-shadow:var(--surface-pop);padding:5px">
            ${['Character', 'Theme', 'Tone', 'Notes', 'Other'].map(t => `
              <div style="padding:5px 10px;cursor:pointer;font-size:12px;color:var(--text2)" onclick="createProjectFile('${t}')">${t}</div>
            `).join('')}
          </div>
          <div id="proj-files-list" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
            ${files.length === 0 ? '<div style="font-size:11px;color:var(--text3);text-align:center">No files yet.</div>' : ''}
            ${files.map(f => `
              <div class="card" style="padding:10px;cursor:pointer;background:var(--bg)" onclick="editProjectFile('${f.id}', \`${f.content.replace(/`/g, '\\`').replace(/\n/g, ' ')}\`)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                  <div style="font-weight:600;font-size:13px">${f.name}</div>
                  <div style="display:flex;gap:5px">
                    <span class="tag-gray" style="font-size:9px">${f.type}</span>
                    <button class="btn btn-sm btn-danger" style="padding:2px 5px" onclick="event.stopPropagation(); deleteProjectFile('${f.id}')">✕</button>
                  </div>
                </div>
                <div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.content.substring(0, 60)}...</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section B: Linked Conversations -->
        <div class="card">
          <div class="ctitle">Linked Conversations 
            <button class="btn btn-sm" onclick="showLinkConvoDropdown()">+ Link Conversation</button>
          </div>
          <div id="convo-link-dropdown" style="display:none;position:absolute;background:var(--bg2);border:1px solid var(--border);border-radius:8px;z-index:10;box-shadow:var(--surface-pop);padding:5px;max-height:200px;overflow-y:auto"></div>
          <div id="proj-convos-list" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
            ${convos.length === 0 ? '<div style="font-size:11px;color:var(--text3);text-align:center">No linked conversations.</div>' : ''}
            ${convos.map(c => `
              <div class="card" style="padding:10px;display:flex;justify-content:space-between;align-items:center;background:var(--bg)">
                <div style="font-size:13px;font-weight:600;color:var(--text)">${c.title || 'Untitled'}</div>
                <button class="btn btn-sm btn-danger" onclick="unlinkConversation('${c.id}')">Unlink</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section C: Linked Scripts -->
        <div class="card">
          <div class="ctitle">Linked Scripts 
            <button class="btn btn-sm" onclick="showLinkScriptDropdown()">+ Link Script</button>
          </div>
          <div id="script-link-dropdown" style="display:none;position:absolute;background:var(--bg2);border:1px solid var(--border);border-radius:8px;z-index:10;box-shadow:var(--surface-pop);padding:5px;max-height:200px;overflow-y:auto"></div>
          <div id="proj-scripts-list" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
            ${scripts.length === 0 ? '<div style="font-size:11px;color:var(--text3);text-align:center">No linked scripts.</div>' : ''}
            ${scripts.map(s => `
              <div class="card" style="padding:10px;display:flex;justify-content:space-between;align-items:center;background:var(--bg)">
                <div style="font-size:13px;font-weight:600;color:var(--text)">${s.title || 'Untitled'}</div>
                <button class="btn btn-sm btn-danger" onclick="unlinkScript('${s.id}')">Unlink</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function updateProjectBasicInfo(id, name, desc) {
  try {
    const { error } = await _sb.from('projects').update({ name, description: desc, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    toast('Project updated');
  } catch (err) {
    console.error('Error updating project info:', err);
    toast('Error updating project');
  }
}

function showFileAddDropdown() {
  const el = document.getElementById('file-add-dropdown');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function createProjectFile(type) {
  const name = prompt('Enter file name:');
  if (!name) return;
  try {
    const { error } = await _sb.from('project_files').insert([{ project_id: selectedProjectId, name, type, content: '', user_id: currentUser.id }]);
    if (error) throw error;
    document.getElementById('file-add-dropdown').style.display = 'none';
    openProject(selectedProjectId);
  } catch (err) {
    console.error('Error creating file:', err);
    toast('Error creating file');
  }
}

async function handleProjectFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target.result;
    try {
      const { error } = await _sb.from('project_files').insert([{ 
        project_id: selectedProjectId, 
        name: file.name, 
        type: 'Other', 
        content: content, 
        user_id: currentUser.id 
      }]);
      if (error) throw error;
      toast('File uploaded');
      openProject(selectedProjectId);
    } catch (err) {
      console.error('Upload error:', err);
      toast('Error uploading file');
    }
  };
  reader.readAsText(file);
}

async function editProjectFile(id, currentContent) {
  const modal = document.createElement('div');
  modal.className = 'overlay';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000';
  
  const box = document.createElement('div');
  box.className = 'mbox';
  box.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:20px;width:600px;max-width:90vw;display:flex;flex-direction:column;gap:15px';
  
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:600;font-size:16px;color:var(--text)';
  title.textContent = 'Edit File Content';
  
  const textarea = document.createElement('textarea');
  textarea.style.cssText = 'width:100%;height:300px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r2);padding:10px;color:var(--text);font-family:monospace;font-size:13px;outline:none;resize:vertical';
  textarea.value = currentContent;
  
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => document.body.removeChild(modal);
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-sm btn-primary';
  saveBtn.textContent = 'Save';
  saveBtn.onclick = async () => {
    try {
      const { error } = await _sb.from('project_files').update({ content: textarea.value }).eq('id', id);
      if (error) throw error;
      toast('File saved');
      document.body.removeChild(modal);
      openProject(selectedProjectId);
    } catch (err) {
      console.error('Error saving file:', err);
      toast('Error saving file');
    }
  };
  
  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);
  box.appendChild(title);
  box.appendChild(textarea);
  box.appendChild(btnRow);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

async function deleteProjectFile(id) {
  if (!confirm('Delete this file?')) return;
  try {
    const { error } = await _sb.from('project_files').delete().eq('id', id);
    if (error) throw error;
    openProject(selectedProjectId);
  } catch (err) {
    console.error('Error deleting file:', err);
    toast('Error deleting file');
  }
}

async function showLinkConvoDropdown() {
  const dropdown = document.getElementById('convo-link-dropdown');
  dropdown.style.display = 'block';
  dropdown.innerHTML = 'Loading...';
  try {
    const { data: allConvos, error } = await _sb.from('brooks_conversations').select('*').eq('user_id', currentUser.id).is('project_id', null);
    if (error) throw error;
    if (allConvos.length === 0) {
      dropdown.innerHTML = '<div style="padding:5px;font-size:11px;color:var(--text3)">No unlinked conversations.</div>';
    } else {
      dropdown.innerHTML = allConvos.map(c => `
        <div style="padding:5px 10px;cursor:pointer;font-size:12px;color:var(--text2)" onclick="linkConversation('${c.id}')">${c.title || 'Untitled'}</div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading convos:', err);
    dropdown.innerHTML = 'Error loading.';
  }
}

async function linkConversation(id) {
  try {
    const { error } = await _sb.from('brooks_conversations').update({ project_id: selectedProjectId }).eq('id', id);
    if (error) throw error;
    document.getElementById('convo-link-dropdown').style.display = 'none';
    openProject(selectedProjectId);
  } catch (err) {
    console.error('Error linking convo:', err);
    toast('Error linking conversation');
  }
}

async function unlinkConversation(id) {
  try {
    const { error } = await _sb.from('brooks_conversations').update({ project_id: null }).eq('id', id);
    if (error) throw error;
    openProject(selectedProjectId);
  } catch (err) {
    console.error('Error unlinking convo:', err);
    toast('Error unlinking conversation');
  }
}

async function showLinkScriptDropdown() {
  const dropdown = document.getElementById('script-link-dropdown');
  dropdown.style.display = 'block';
  dropdown.innerHTML = 'Loading...';
  try {
    const { data: allScripts, error } = await _sb.from('studio_scripts').select('*').eq('user_id', currentUser.id).is('project_id', null);
    if (error) throw error;
    if (allScripts.length === 0) {
      dropdown.innerHTML = '<div style="padding:5px;font-size:11px;color:var(--text3)">No unlinked scripts.</div>';
    } else {
      dropdown.innerHTML = allScripts.map(s => `
        <div style="padding:5px 10px;cursor:pointer;font-size:12px;color:var(--text2)" onclick="linkScript('${s.id}')">${s.title || 'Untitled'}</div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading scripts:', err);
    dropdown.innerHTML = 'Error loading.';
  }
}

async function linkScript(id) {
  try {
    const { error } = await _sb.from('studio_scripts').update({ project_id: selectedProjectId }).eq('id', id);
    if (error) throw error;
    document.getElementById('script-link-dropdown').style.display = 'none';
    openProject(selectedProjectId);
  } catch (err) {
    console.error('Error linking script:', err);
    toast('Error linking script');
  }
}

async function unlinkScript(id) {
  try {
    const { error } = await _sb.from('studio_scripts').update({ project_id: null }).eq('id', id);
    if (error) throw error;
    openProject(selectedProjectId);
  } catch (err) {
    console.error('Error unlinking script:', err);
    toast('Error unlinking script');
  }
}

function closeProjectModal() {
  document.getElementById('project-modal').style.display = 'none';
  editingProjectId = null;
}