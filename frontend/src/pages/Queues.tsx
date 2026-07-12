import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const fetchQueues = async () => {
  const { data } = await api.get('/queues');
  return data;
};

const createQueue = async ({ name, projectId }: { name: string, projectId: string }) => {
  const { data } = await api.post('/queues', { name, projectId });
  return data;
};

const deleteQueue = async (id: string) => {
  await api.delete(`/queues/${id}`);
};

const Queues = () => {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'create'|'edit'; data?: any }>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState({ name: '', projectId: '' });

  const { data: queues, isLoading, error } = useQuery({
    queryKey: ['queues'],
    queryFn: fetchQueues
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/projects')).data
  });

  const createMutation = useMutation({
    mutationFn: createQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setModalState({ isOpen: false, mode: 'create' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalState.mode === 'create') {
      createMutation.mutate({ name: formData.name, projectId: formData.projectId });
    }
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Queues</h1>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', projectId: projects?.[0]?.id || '' }); setModalState({ isOpen: true, mode: 'create' }); }}
          className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> New Queue
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border">
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Name</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Project ID</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Concurrency Limit</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Created At</th>
                <th className="py-2.5 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface font-body-md text-body-md">
              {isLoading ? (
                <tr><td colSpan={5} className="py-4 text-center text-on-surface-variant">Loading queues...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="py-4 text-center text-error">Failed to load queues.</td></tr>
              ) : !queues || queues.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center text-on-surface-variant">No queues found.</td></tr>
              ) : (
                queues.map((queue: any) => (
                  <tr key={queue.id} className="hover:bg-surface-bright transition-colors group">
                    <td className="py-3 px-4 font-medium text-on-surface">{queue.name}</td>
                    <td className="py-3 px-4 font-code-sm text-on-surface-variant">{queue.projectId}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{queue.maxConcurrency}</td>
                    <td className="py-3 px-4 font-code-sm text-on-surface-variant text-sm">
                      {new Date(queue.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        className="text-error hover:text-error/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMutation.mutate(queue.id)}
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalState.isOpen && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="font-headline-sm text-headline-sm mb-4">Create Queue</h3>
            <form onSubmit={handleSubmit}>
              <label className="block mb-4">
                <span className="text-sm font-medium mb-1 block">Name</span>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-border rounded-lg p-2 bg-surface" />
              </label>
              <label className="block mb-4">
                <span className="text-sm font-medium mb-1 block">Project</span>
                <select required value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full border border-border rounded-lg p-2 bg-surface">
                  <option value="">Select a project...</option>
                  {projects?.map((proj: any) => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
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

export default Queues;
