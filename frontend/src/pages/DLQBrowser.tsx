import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';

const fetchDLQ = async () => {
  const { data } = await api.get('/dlq');
  return data;
};

const DLQBrowser = () => {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['dlq-jobs'],
    queryFn: fetchDLQ,
    refetchInterval: 15000,
  });

  const requeueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/dlq/${id}/requeue`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
    },
  });

  const requeueAllMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/dlq/requeue-all');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
    },
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full">
      <div className="flex-1 overflow-auto p-margin-desktop bg-surface-bright dark:bg-inverse-surface">
        <div className="max-w-container-max mx-auto h-full flex flex-col gap-6">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-error mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[28px]">warning</span>
                Dead Letter Queue
              </h2>
              <p className="text-text-secondary font-body-md text-body-md">
                {jobs.length} failed job{jobs.length !== 1 ? 's' : ''} — investigate and retry.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (jobs.length === 0) return;
                  if (confirm(`Requeue all ${jobs.length} failed jobs?`)) {
                    requeueAllMutation.mutate();
                  }
                }}
                disabled={requeueAllMutation.isPending || jobs.length === 0}
                className="flex items-center gap-2 bg-primary-container text-on-primary-container hover:opacity-90 px-4 py-2 rounded-lg font-label-md text-label-md transition-opacity shadow-sm disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                {requeueAllMutation.isPending ? 'Requeueing…' : 'Retry All'}
              </button>
            </div>
          </div>

          <div className="bg-surface dark:bg-surface-variant border border-error/30 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto bg-surface dark:bg-inverse-surface">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-error-container/10 border-b border-error/30 z-10">
                  <tr>
                    <th className="font-label-sm text-label-sm text-error/80 p-4 font-semibold uppercase tracking-wider">Job ID</th>
                    <th className="font-label-sm text-label-sm text-error/80 p-4 font-semibold uppercase tracking-wider">Queue</th>
                    <th className="font-label-sm text-label-sm text-error/80 p-4 font-semibold uppercase tracking-wider">Error</th>
                    <th className="font-label-sm text-label-sm text-error/80 p-4 font-semibold uppercase tracking-wider">Failed At</th>
                    <th className="font-label-sm text-label-sm text-error/80 p-4 font-semibold uppercase tracking-wider">Attempts</th>
                    <th className="font-label-sm text-label-sm text-error/80 p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-error/10 font-body-md text-body-md text-text-primary dark:text-inverse-on-surface">
                  {isLoading ? (
                    <tr><td colSpan={6} className="p-4 text-center text-text-secondary">Loading DLQ…</td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="p-4 text-center text-error">Failed to load DLQ jobs.</td></tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-text-secondary">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success">
                            <span className="material-symbols-outlined text-[32px]">check_circle</span>
                          </div>
                          <div className="font-headline-md text-headline-md text-text-primary">No Failed Jobs</div>
                          <p>The Dead Letter Queue is currently empty.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job: any) => (
                      <tr key={job.id} className="hover:bg-error/5 transition-colors group">
                        <td className="p-4">
                          <div className="font-code-sm text-code-sm text-text-primary">{job.id.slice(0, 12)}…</div>
                          <div className="text-xs text-outline-variant mt-0.5">{job.status}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-code-sm text-code-sm bg-surface-container-high px-2 py-1 rounded text-text-primary">
                            {job.queue?.name || job.queueId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="text-error text-sm truncate" title={JSON.stringify(job.errorPayload)}>
                            {job.errorPayload
                              ? (typeof job.errorPayload === 'object' ? (job.errorPayload as any).message || JSON.stringify(job.errorPayload) : String(job.errorPayload))
                              : 'No error payload'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-text-secondary">
                            {new Date(job.completedAt || job.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-label-sm text-label-sm text-on-surface">{job.attemptCount}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors flex items-center"
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                            </Link>
                            <button
                              onClick={() => requeueMutation.mutate(job.id)}
                              disabled={requeueMutation.isPending}
                              className="p-1.5 text-text-secondary hover:text-success hover:bg-success/10 rounded transition-colors disabled:opacity-50"
                              title="Requeue Job"
                            >
                              <span className="material-symbols-outlined text-[18px]">replay</span>
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
    </div>
  );
};

export default DLQBrowser;
