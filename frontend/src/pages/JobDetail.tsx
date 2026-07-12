import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { WS_BASE_URL } from '../services/api';
import { useWebSockets } from '../hooks/useWebSockets';
import { toast } from 'react-hot-toast';

const fetchJob = async (id: string) => {
  const { data } = await api.get(`/jobs/${id}`);
  return data;
};

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [logsOpen, setLogsOpen] = useState(false);

  const { data: jobData, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => fetchJob(id!),
    enabled: !!id
  });

  const { lastMessage } = useWebSockets(WS_BASE_URL);
  useEffect(() => {
    if (lastMessage && lastMessage.type && lastMessage.type.startsWith('job.')) {
      if (lastMessage.payload && lastMessage.payload.id === id) {
        queryClient.invalidateQueries({ queryKey: ['job', id] });
      }
    }
  }, [lastMessage, queryClient, id]);

  const retryMutation = useMutation({
    mutationFn: () => api.patch(`/jobs/${id}/retry`),
    onSuccess: () => {
      toast.success('Job retried successfully');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to retry job')
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/jobs/${id}/cancel`, { reason: 'Cancelled via UI' }),
    onSuccess: () => {
      toast.success('Job cancelled');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to cancel job')
  });

  const cloneMutation = useMutation({
    mutationFn: () => api.post(`/jobs/${id}/clone`, {}),
    onSuccess: (res) => {
      toast.success('Job cloned successfully');
      navigate(`/jobs/${res.data.id}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to clone job')
  });

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-on-surface-variant"><span className="material-symbols-outlined animate-spin text-[32px]">refresh</span></div>;
  }
  if (error || !jobData) {
    return <div className="flex-1 flex items-center justify-center text-error">Failed to load job or job not found.</div>;
  }

  // The controller returns the job properties merged with workerDetails and executions
  const job = jobData;
  const worker = jobData.workerDetails;
  const executions = jobData.executions || [];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full bg-background dark:bg-inverse-surface">
      <header className="h-16 border-b border-border dark:border-outline-variant bg-surface/80 dark:bg-inverse-surface/80 backdrop-blur-md flex items-center justify-between px-gutter shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="p-1 rounded hover:bg-surface-container-high transition-colors text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h2 className="font-headline-md text-headline-md text-text-primary dark:text-inverse-on-surface flex items-center gap-2">
              Job: {job.payload?.name || job.id.substring(0,8)}
              {job.status === 'FAILED' && (
                <span className="inline-flex items-center rounded-full bg-error-container/20 px-2 py-0.5 text-xs font-medium text-error ring-1 ring-inset ring-error/20 gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span> Failed
                </span>
              )}
              {job.status === 'COMPLETED' && (
                <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success ring-1 ring-inset ring-success/20 gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> Completed
                </span>
              )}
              {job.status === 'RUNNING' && (
                <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info ring-1 ring-inset ring-info/20 gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse"></span> Running
                </span>
              )}
              {job.status === 'QUEUED' && (
                <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning ring-1 ring-inset ring-warning/20 gap-1">
                  <span className="material-symbols-outlined text-[14px]">pending</span> Queued
                </span>
              )}
               {job.status === 'SCHEDULED' && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 gap-1">
                  <span className="material-symbols-outlined text-[14px]">calendar_clock</span> Scheduled
                </span>
              )}
               {job.status === 'RETRY_PENDING' && (
                <span className="inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/20 gap-1">
                  <span className="material-symbols-outlined text-[14px]">replay</span> Retrying
                </span>
              )}
               {job.status === 'DEAD_LETTER' && (
                <span className="inline-flex items-center rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error ring-1 ring-inset ring-error/20 gap-1">
                  <span className="material-symbols-outlined text-[14px]">block</span> Dead Letter
                </span>
              )}
            </h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => cloneMutation.mutate()}
            disabled={cloneMutation.isPending}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-on-surface font-label-md text-label-md hover:bg-surface-container-low disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">file_copy</span> Clone
          </button>
          
          {(job.status === 'QUEUED' || job.status === 'SCHEDULED' || job.status === 'RUNNING' || job.status === 'RETRY_PENDING') && (
            <button 
              onClick={() => { if(window.confirm('Cancel this job?')) cancelMutation.mutate(); }}
              disabled={cancelMutation.isPending}
              className="px-4 py-2 rounded-lg border border-border bg-surface text-error font-label-md text-label-md hover:bg-error/10 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span> Cancel
            </button>
          )}

          {(job.status === 'FAILED' || job.status === 'DEAD_LETTER' || job.status === 'CANCELLED') && (
            <button 
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span> Retry
            </button>
          )}

          <button 
            className={`ml-2 p-2 rounded-lg border transition-colors flex items-center justify-center ${logsOpen ? 'bg-inverse-surface text-inverse-on-surface border-inverse-surface' : 'border-border bg-surface text-on-surface hover:bg-surface-container-low'}`}
            onClick={() => setLogsOpen(!logsOpen)}
            title="Toggle Executions & Logs"
          >
            <span className="material-symbols-outlined text-[20px]">terminal</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-margin-desktop bg-surface-bright dark:bg-inverse-surface flex gap-6 relative">
        <div className="flex-1 flex flex-col gap-6 max-w-container-max mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface dark:bg-surface-variant rounded-xl border border-border dark:border-outline-variant p-4 shadow-sm">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Queue</p>
              <p className="font-body-md text-body-md font-medium text-on-surface flex items-center gap-2" title={job.queue?.name || job.queueId}>
                <span className="material-symbols-outlined text-[16px] text-primary">layers</span> {job.queue?.name || job.queueId.substring(0,12)}
              </p>
            </div>
            <div className="bg-surface dark:bg-surface-variant rounded-xl border border-border dark:border-outline-variant p-4 shadow-sm">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Created At</p>
              <p className="font-body-md text-body-md font-medium text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-info">calendar_today</span> {new Date(job.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="bg-surface dark:bg-surface-variant rounded-xl border border-border dark:border-outline-variant p-4 shadow-sm">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Priority</p>
              <p className="font-body-md text-body-md font-medium text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-warning">star</span> {job.priority}
              </p>
            </div>
            <div className="bg-surface dark:bg-surface-variant rounded-xl border border-border dark:border-outline-variant p-4 shadow-sm">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Attempts</p>
              <p className="font-body-md text-body-md font-medium text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-secondary">replay</span> {job.attemptCount || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.scheduledAt && (
              <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
                <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Scheduled For</p>
                <p className="font-body-md text-on-surface">{new Date(job.scheduledAt).toLocaleString()}</p>
              </div>
            )}
            {job.startedAt && (
              <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
                <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Started At</p>
                <p className="font-body-md text-on-surface">{new Date(job.startedAt).toLocaleString()}</p>
              </div>
            )}
            {job.completedAt && (
              <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
                <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Completed / Failed At</p>
                <p className="font-body-md text-on-surface">{new Date(job.completedAt).toLocaleString()}</p>
              </div>
            )}
            {worker && (
              <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
                <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Assigned Worker</p>
                <p className="font-code-sm text-on-surface">{worker.hostname} ({worker.id.substring(0,8)})</p>
              </div>
            )}
          </div>

          {job.errorPayload && (
             <div className="bg-error/5 border border-error/20 rounded-xl p-4 shadow-sm">
                <h3 className="font-label-md text-error flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px]">error</span> Error Payload
                </h3>
                <pre className="font-code-sm text-error whitespace-pre-wrap">
                  {JSON.stringify(job.errorPayload, null, 2)}
                </pre>
             </div>
          )}
          
          {job.outputPayload && (
             <div className="bg-success/5 border border-success/20 rounded-xl p-4 shadow-sm">
                <h3 className="font-label-md text-success flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Output Payload
                </h3>
                <pre className="font-code-sm text-success whitespace-pre-wrap">
                  {JSON.stringify(job.outputPayload, null, 2)}
                </pre>
             </div>
          )}

          <div className="bg-surface dark:bg-surface-variant rounded-xl border border-border dark:border-outline-variant overflow-hidden shadow-sm flex flex-col flex-1 min-h-[300px]">
            <div className="px-4 py-3 border-b border-border dark:border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="font-label-md text-label-md font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">description</span> Input Payload
              </h3>
            </div>
            <div className="p-4 bg-inverse-surface overflow-auto flex-1">
              <pre className="font-code-sm text-code-sm text-inverse-on-surface">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div 
          className={`absolute top-0 right-0 bottom-0 w-1/3 min-w-[400px] border-l border-border dark:border-outline-variant bg-inverse-surface shadow-2xl transform transition-transform duration-300 z-30 flex flex-col ${logsOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="h-14 border-b border-outline-variant flex items-center justify-between px-4 shrink-0 bg-inverse-surface">
            <h3 className="font-headline-md text-headline-md text-inverse-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-outline-variant">history</span> Execution History
            </h3>
            <div className="flex items-center gap-3">
              <button className="text-outline-variant hover:text-inverse-on-surface transition-colors" onClick={() => setLogsOpen(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 font-code-sm text-code-sm text-outline-variant space-y-4">
            {executions.length === 0 ? (
              <div className="text-center text-outline-variant py-8">No execution records found.</div>
            ) : (
              executions.map((exec: any) => (
                <div key={exec.id} className="border border-outline-variant rounded p-3">
                  <div className="flex justify-between items-center border-b border-outline-variant pb-2 mb-2">
                     <span className={`font-bold ${exec.status === 'COMPLETED' ? 'text-success' : exec.status === 'FAILED' ? 'text-error' : 'text-info'}`}>{exec.status}</span>
                     <span>{new Date(exec.startedAt).toLocaleString()}</span>
                  </div>
                  <p>Worker: {exec.workerId.substring(0,8)}</p>
                  {exec.completedAt && <p>Duration: {new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()}ms</p>}
                  {exec.errorMessage && (
                    <div className="mt-2 text-error">
                      Error: {exec.errorMessage}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
