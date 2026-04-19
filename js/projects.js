/**
 * Projects Management for C4A
 */

let selectedProjectId = null;
let editingProjectId = null;

async function loadProjects() {
  const listEl = document.getElementById('projects-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">Loading projects...</div>';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!projects || projects.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">No projects found. Create one to get started!</div>';
      return;
    }

    // To avoid N+1 queries, we fetch all related items for the user and count them in JS
    const [scriptsRes, convosRes, filesRes] = await Promise.all([
      supabase.from('scripts').select('project_id').eq('user_id', user.id),
      supabase.from('brooks_conversations').select('project_id').eq('user_id', user.id),
      supabase.from('project_files').select('project_id').eq('user_id', user.id)
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (editingProjectId) {
      const { error } = await supabase
        .from('projects')
        .update({ name, description: desc, updated_at: new Date().toISOString() })
        .eq('id', editingProjectId);
      if (error) throw error;
      toast('Project updated');
    } else {
      const { error } = await supabase
        .from('projects')
        .insert([{ user_id: user.id, name, description: desc }]);
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
    const { data: proj, error } = await supabase
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
    const { error } = await supabase
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

function openProject(id) {
  selectedProjectId = id;
  toast('Project selected: ' + id + ' (Detail view coming soon!)');
}

function closeProjectModal() {
  document.getElementById('project-modal').style.display = 'none';
  editingProjectId = null;
}