import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const fetchOrgs = async () => {
  const { data } = await api.get('/organizations');
  return data;
};

const createOrg = async (name: string) => {
  const { data } = await api.post('/organizations', { name });
  return data;
};

const updateOrg = async ({ id, name }: { id: string, name: string }) => {
  const { data } = await api.patch(`/organizations/${id}`, { name });
  return data;
};

const deleteOrg = async (id: string) => {
  await api.delete(`/organizations/${id}`);
};

const Organizations = () => {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'create'|'edit'; data?: any }>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState({ name: '' });

  const { data: orgs, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrgs
  });

  const createMutation = useMutation({
    mutationFn: createOrg,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setModalState({ isOpen: false, mode: 'create' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateOrg,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setModalState({ isOpen: false, mode: 'create' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrg,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalState.mode === 'create') {
      createMutation.mutate(formData.name);
    } else if (modalState.mode === 'edit' && modalState.data?.id) {
      updateMutation.mutate({ id: modalState.data.id, name: formData.name });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full">
      <div className="flex-1 overflow-auto p-margin-desktop bg-surface-bright dark:bg-inverse-surface">
        <div className="max-w-container-max mx-auto h-full flex flex-col gap-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-text-primary dark:text-inverse-on-surface mb-1">Organizations</h2>
              <p className="text-text-secondary dark:text-surface-dim font-body-md text-body-md">Manage top-level organizations, billing, and team members.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setFormData({ name: '' }); setModalState({ isOpen: true, mode: 'create' }); }}
                className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:opacity-90 px-4 py-2 rounded-lg font-label-md text-label-md transition-opacity shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> Create Org
              </button>
            </div>
          </div>

          <div className="bg-surface dark:bg-surface-variant border border-border dark:border-outline-variant rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto bg-surface dark:bg-inverse-surface">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-low dark:bg-surface-variant border-b border-border dark:border-outline-variant z-10">
                  <tr>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider">Organization</th>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider">Slug</th>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider">Members</th>
                    <th className="font-label-sm text-label-sm text-text-secondary dark:text-surface-dim p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-outline-variant font-body-md text-body-md text-text-primary dark:text-inverse-on-surface">
                  {isLoading ? (
                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary">Loading organizations...</td></tr>
                  ) : error ? (
                    <tr><td colSpan={4} className="p-4 text-center text-error">Failed to load organizations.</td></tr>
                  ) : !orgs || orgs.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-text-secondary">No organizations found.</td></tr>
                  ) : (
                    orgs.map((org: any) => (
                      <tr key={org.id} className="hover:bg-surface-container-low/50 dark:hover:bg-surface-variant/50 transition-colors group cursor-pointer">
                        <td className="p-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">corporate_fare</span>{org.name}</td>
                        <td className="p-4 font-code-sm text-text-secondary">{org.slug}</td>
                        <td className="p-4">{org.members || 1}</td>
                        <td className="p-4 text-right">
                          <button className="p-1.5 text-text-secondary hover:text-primary transition-colors" title="Edit" onClick={() => { setFormData({ name: org.name }); setModalState({ isOpen: true, mode: 'edit', data: org }); }}>
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button className="p-1.5 text-error hover:bg-error/10 transition-colors" title="Delete" onClick={() => deleteMutation.mutate(org.id)}>
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
            <h3 className="font-headline-sm text-headline-sm mb-4">{modalState.mode === 'create' ? 'Create Organization' : 'Edit Organization'}</h3>
            <form onSubmit={handleSubmit}>
              <label className="block mb-4">
                <span className="text-sm font-medium mb-1 block">Name</span>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-border rounded-lg p-2 bg-surface" />
              </label>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModalState({ isOpen: false, mode: 'create' })} className="px-4 py-2 text-text-secondary font-medium">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
