import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const fetchProjects = async () => {
  const { data } = await api.get('/projects');
  return data;
};

const createProject = async ({ name, orgId }: { name: string, orgId: string }) => {
  const { data } = await api.post('/projects', { name, orgId });
  return data;
};

const deleteProject = async (id: string) => {
  await api.delete(`/projects/${id}`);
};

const Projects = () => {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'create'|'edit'; data?: any }>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState({ name: '', orgId: '' });

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects
  });

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => (await api.get('/organizations')).data
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setModalState({ isOpen: false, mode: 'create' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalState.mode === 'create') {
      createMutation.mutate({ name: formData.name, orgId: formData.orgId });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full">
      <div className="flex-1 overflow-auto p-margin-desktop bg-surface-bright dark:bg-inverse-surface">
        <div className="max-w-container-max mx-auto h-full flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-text-primary dark:text-inverse-on-surface mb-1">Projects</h2>
              <p className="text-text-secondary dark:text-surface-dim font-body-md text-body-md">Group queues, jobs, and workers by project.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setFormData({ name: '', orgId: orgs?.[0]?.id || '' }); setModalState({ isOpen: true, mode: 'create' }); }}
                className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:opacity-90 px-4 py-2 rounded-lg font-label-md text-label-md transition-opacity shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> Create Project
              </button>
            </div>
          </div>

          <div className="bg-surface dark:bg-surface-variant border border-border dark:border-outline-variant rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto bg-surface dark:bg-inverse-surface">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-low dark:bg-surface-variant border-b border-border dark:border-outline-variant z-10">
                  <tr>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider">Project Name</th>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider">ID</th>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider">Status</th>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-outline-variant font-body-md text-body-md text-text-primary dark:text-inverse-on-surface">
                  {isLoading ? (
                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary">Loading projects...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={4} className="p-4 text-center text-error">Failed to load projects.</td></tr>
                  ) : !projects || projects.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-text-secondary">No projects found.</td></tr>
                  ) : (
                    projects.map((proj: any) => (
                      <tr key={proj.id} className="hover:bg-surface-container-low/50 dark:hover:bg-surface-variant/50 transition-colors group cursor-pointer">
                        <td className="p-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">folder</span>{proj.name}</td>
                        <td className="p-4 font-code-sm text-text-secondary">{proj.id}</td>
                        <td className="p-4"><span className="bg-success/10 text-success px-2 py-0.5 rounded-full text-xs font-medium">{proj.status || 'ACTIVE'}</span></td>
                        <td className="p-4 text-right">
                          <button className="p-1.5 text-error hover:bg-error/10 transition-colors" title="Delete" onClick={() => deleteMutation.mutate(proj.id)}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {modalState.isOpen && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="font-headline-sm text-headline-sm mb-4">Create Project</h3>
            <form onSubmit={handleSubmit}>
              <label className="block mb-4">
                <span className="text-sm font-medium mb-1 block">Name</span>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-border rounded-lg p-2 bg-surface" />
              </label>
              <label className="block mb-4">
                <span className="text-sm font-medium mb-1 block">Organization</span>
                <select required value={formData.orgId} onChange={e => setFormData({ ...formData, orgId: e.target.value })} className="w-full border border-border rounded-lg p-2 bg-surface">
                  <option value="">Select an organization...</option>
                  {orgs?.map((org: any) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalState({ isOpen: false, mode: 'create' })} className="px-4 py-2 text-text-secondary font-medium">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
