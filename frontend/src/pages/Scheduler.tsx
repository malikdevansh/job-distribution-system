import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../services/api';

const fetchScheduledJobs = async () => {
  const { data } = await api.get('/scheduled-jobs');
  return data;
};

const fetchQueues = async () => {
  const { data } = await api.get('/queues');
  return data;
};

interface CreateScheduleForm {
  queueId: string;
  cron: string;
  payload: string;
}

const Scheduler = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateScheduleForm>({ queueId: '', cron: '*/5 * * * *', payload: '{}' });
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ['scheduled-jobs'],
    queryFn: fetchScheduledJobs,
    refetchInterval: 15000,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: fetchQueues,
  });

  const createMutation = useMutation({
    mutationFn: async (body: { queueId: string; cron: string; payload: object }) => {
      const { data } = await api.post('/scheduled-jobs', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
      setShowModal(false);
      setForm({ queueId: '', cron: '*/5 * * * *', payload: '{}' });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.error || 'Failed to create schedule');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/scheduled-jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] });
    },
  });

  const handleCreate = () => {
    setFormError(null);
    let payload: object;
    try {
      payload = JSON.parse(form.payload);
    } catch {
      setFormError('Payload must be valid JSON');
      return;
    }
    if (!form.queueId) { setFormError('Please select a queue'); return; }
    createMutation.mutate({ queueId: form.queueId, cron: form.cron, payload });
  };

  const filtered = schedules.filter((s: any) =>
    s.cron?.includes(search) || s.queueId?.includes(search) || s.queue?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full">
      <div className="flex-1 overflow-auto p-margin-desktop bg-surface-bright dark:bg-inverse-surface">
        <div className="max-w-container-max mx-auto h-full flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-text-primary dark:text-inverse-on-surface mb-1">Scheduler</h2>
              <p className="text-text-secondary dark:text-surface-dim font-body-md text-body-md">Manage recurring cron jobs from PostgreSQL.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:opacity-90 px-4 py-2 rounded-lg font-label-md text-label-md transition-opacity shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> Create Schedule
              </button>
            </div>
          </div>

          <div className="bg-surface dark:bg-surface-variant border border-border dark:border-outline-variant rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-container-low">
              <div className="relative w-full sm:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">search</span>
                <input
                  className="w-full bg-surface border border-border rounded-lg py-2 pl-10 pr-4 font-body-md text-body-md text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline-variant"
                  placeholder="Search by queue or cron..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="font-label-sm text-label-sm text-outline-variant">{filtered.length} schedules</span>
            </div>

            <div className="flex-1 overflow-auto bg-surface">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-low border-b border-border z-10">
                  <tr>
                    <th className="font-label-sm text-label-sm text-text-secondary p-4 font-semibold uppercase tracking-wider">Queue</th>
                    <th className="font-label-sm text-label-sm text-text-secondary p-4 font-semibold uppercase tracking-wider">Cron Expression</th>
                    <th className="font-label-sm text-label-sm text-text-secondary p-4 font-semibold uppercase tracking-wider">Next Run</th>
                    <th className="font-label-sm text-label-sm text-text-secondary p-4 font-semibold uppercase tracking-wider">Status</th>
                    <th className="font-label-sm text-label-sm text-text-secondary p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-body-md text-body-md text-text-primary">
                  {isLoading ? (
                    <tr><td colSpan={5} className="p-4 text-center text-text-secondary">Loading schedules…</td></tr>
                  ) : error ? (
                    <tr><td colSpan={5} className="p-4 text-center text-error">Failed to load schedules.</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-secondary">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-[32px] text-outline-variant">event_busy</span>
                          {search ? 'No schedules match your search.' : 'No active schedules — create one to get started.'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((schedule: any) => (
                      <tr key={schedule.id} className="hover:bg-surface-container-low/50 transition-colors group">
                        <td className="p-4">
                          <div className="font-medium text-text-primary">{schedule.queue?.name || '—'}</div>
                          <div className="font-code-sm text-xs text-text-secondary mt-0.5 truncate w-48" title={schedule.queueId}>{schedule.queueId}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-code-sm text-code-sm bg-surface-container-high px-2 py-1 rounded text-text-primary">
                            {schedule.cron}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-text-secondary">
                            {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success ring-1 ring-inset ring-success/20 gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Active
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                if (confirm(`Delete schedule for "${schedule.queue?.name}"?`)) {
                                  deleteMutation.mutate(schedule.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">Create Recurring Schedule</h3>

            {formError && (
              <div className="bg-error/10 border border-error/30 text-error text-sm rounded-lg p-3 mb-4">{formError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Queue *</label>
                <select
                  value={form.queueId}
                  onChange={(e) => setForm((f) => ({ ...f, queueId: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-lg py-2 px-3 text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Select a queue…</option>
                  {queues.map((q: any) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Cron Expression *</label>
                <input
                  value={form.cron}
                  onChange={(e) => setForm((f) => ({ ...f, cron: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-lg py-2 px-3 font-code-sm text-on-surface focus:outline-none focus:border-primary"
                  placeholder="*/5 * * * *"
                />
                <div className="text-xs text-outline-variant mt-1">minute hour day month weekday</div>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Payload (JSON)</label>
                <textarea
                  value={form.payload}
                  onChange={(e) => setForm((f) => ({ ...f, payload: e.target.value }))}
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg py-2 px-3 font-code-sm text-on-surface focus:outline-none focus:border-primary resize-none"
                  placeholder="{}"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setFormError(null); }}
                className="px-4 py-2 rounded-lg border border-border text-on-surface font-label-md text-label-md hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
