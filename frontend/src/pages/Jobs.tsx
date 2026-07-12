import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import api, { WS_BASE_URL } from '../services/api';
import { useWebSockets } from '../hooks/useWebSockets';
import { toast } from 'react-hot-toast';

const fetchJobs = async (params: any) => {
  const { data } = await api.get('/jobs', { params });
  return data;
};

const fetchQueues = async () => {
  const { data } = await api.get('/queues');
  return data;
};

const deleteJob = async (id: string) => {
  await api.delete(`/jobs/${id}`);
};

const Jobs = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status') || '';
  const queueId = searchParams.get('queueId') || '';
  const search = searchParams.get('search') || '';

  const { data: jobsData, isLoading, isError } = useQuery({
    queryKey: ['jobs', { page, limit, status, queueId, search }],
    queryFn: () => fetchJobs({ page, limit, status, queueId, search })
  });
  
  const { data: queues } = useQuery({
    queryKey: ['queues'],
    queryFn: fetchQueues
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      toast.success('Job deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete job');
    }
  });

  const { lastMessage } = useWebSockets(WS_BASE_URL);
  useEffect(() => {
    if (lastMessage && lastMessage.type && lastMessage.type.startsWith('job.')) {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  }, [lastMessage, queryClient]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Jobs</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/jobs/new" className="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Job
          </Link>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <select 
              value={status} 
              onChange={(e) => updateParam('status', e.target.value)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low hover:border-outline transition-all outline-none"
            >
              <option value="">All Statuses</option>
              <option value="QUEUED">QUEUED</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="RUNNING">RUNNING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="RETRY_PENDING">RETRY_PENDING</option>
              <option value="DEAD_LETTER">DEAD_LETTER</option>
            </select>
          </div>
          <div className="relative group">
            <select 
              value={queueId} 
              onChange={(e) => updateParam('queueId', e.target.value)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low hover:border-outline transition-all outline-none max-w-[200px]"
            >
              <option value="">All Queues</option>
              {queues?.map((q: any) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>
          <div className="relative group flex-1 min-w-[200px]">
            <input 
              type="text"
              placeholder="Search ID..."
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
              className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg font-body-md text-body-md text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
          {(status || queueId || search || page > 1) && (
            <button onClick={clearFilters} className="text-primary font-label-md text-label-md hover:underline ml-2">Clear All</button>
          )}
        </div>
      </div>

      {/* Data Table Widget */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-border">
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Job ID</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Name/Payload</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Status</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Queue</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Priority</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Attempts</th>
                <th className="py-2.5 px-4 font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wide uppercase">Created/Scheduled</th>
                <th className="py-2.5 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface font-body-md text-body-md">
              {isLoading ? (
                <tr><td colSpan={8} className="py-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin mb-2">refresh</span>
                  <p>Loading jobs...</p>
                </td></tr>
              ) : isError ? (
                 <tr><td colSpan={8} className="py-8 text-center text-error">Failed to load jobs</td></tr>
              ) : jobsData?.jobs?.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-on-surface-variant">No jobs found matching criteria.</td></tr>
              ) : (
                jobsData?.jobs?.map((job: any) => (
                  <tr key={job.id} className="hover:bg-surface-bright transition-colors group">
                    <td className="py-2 px-4">
                      <Link to={`/jobs/${job.id}`} className="font-code-sm text-code-sm text-primary hover:underline">
                        {job.id.substring(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2 px-4 font-medium text-on-surface truncate max-w-[200px]" title={JSON.stringify(job.payload)}>
                      {job.payload?.name || 'Job'}
                    </td>
                    <td className="py-2 px-4">
                      {job.status === 'RUNNING' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-info/10 text-info font-label-sm text-label-sm border border-info/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse"></span> Running
                        </span>
                      )}
                      {job.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error/10 text-error font-label-sm text-label-sm border border-error/20">
                          <span className="material-symbols-outlined text-[14px]">error</span> Failed
                        </span>
                      )}
                      {job.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success font-label-sm text-label-sm border border-success/20">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span> Completed
                        </span>
                      )}
                      {job.status === 'QUEUED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 text-warning font-label-sm text-label-sm border border-warning/20">
                          <span className="material-symbols-outlined text-[14px]">pending</span> Queued
                        </span>
                      )}
                      {job.status === 'DEAD_LETTER' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error/10 text-error font-label-sm text-label-sm border border-error/20">
                          <span className="material-symbols-outlined text-[14px]">block</span> Dead Letter
                        </span>
                      )}
                      {job.status === 'SCHEDULED' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm border border-primary/20">
                          <span className="material-symbols-outlined text-[14px]">calendar_clock</span> Scheduled
                        </span>
                      )}
                       {job.status === 'RETRY_PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm border border-secondary/20">
                          <span className="material-symbols-outlined text-[14px]">replay</span> Retrying
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-on-surface-variant font-code-sm">
                      {queues?.find((q: any) => q.id === job.queueId)?.name || job.queueId.substring(0, 8)}
                    </td>
                    <td className="py-2 px-4 text-on-surface-variant">{job.priority}</td>
                    <td className="py-2 px-4 text-on-surface-variant">{job.attemptCount || 0}</td>
                    <td className="py-2 px-4 text-on-surface-variant font-code-sm text-code-sm">
                      {new Date(job.scheduledAt || job.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/jobs/${job.id}`} className="text-outline-variant hover:text-primary p-1">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </Link>
                        <button 
                          className="text-error/70 hover:text-error p-1 disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm('Delete this job permanently?')) deleteMutation.mutate(job.id);
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
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
      
      {/* Pagination Controls */}
      {jobsData?.total > 0 && (
        <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border mb-8 shadow-sm">
          <p className="text-body-md text-on-surface-variant">
            Showing <span className="font-medium text-on-surface">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-on-surface">{Math.min(page * limit, jobsData.total)}</span> of <span className="font-medium text-on-surface">{jobsData.total}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1}
              onClick={() => updateParam('page', String(page - 1))}
              className="p-1.5 rounded-lg border border-border text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 flex items-center"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="text-label-md font-medium px-4">{page}</span>
            <button 
              disabled={page * limit >= jobsData.total}
              onClick={() => updateParam('page', String(page + 1))}
              className="p-1.5 rounded-lg border border-border text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 flex items-center"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
