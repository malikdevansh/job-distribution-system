import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api, { WS_BASE_URL } from '../services/api';
import { useWebSockets } from '../hooks/useWebSockets';
import { useAuthStore } from '../store/auth';

const fetchWorkers = async () => {
  const { data } = await api.get('/workers');
  return data;
};

const Workers = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const { lastMessage } = useWebSockets(WS_BASE_URL, token);

  useEffect(() => {
    if (lastMessage?.event?.startsWith('worker') || lastMessage?.event === 'dashboard:updated') {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    }
  }, [lastMessage, queryClient]);

  const { data: workers, isLoading, error } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
    refetchInterval: 15000,
  });

  const activeWorkers = workers?.filter((w: any) => w.status !== 'OFFLINE')?.length || 0;
  const offlineWorkers = workers?.filter((w: any) => w.status === 'OFFLINE')?.length || 0;

  return (
    <div className="max-w-container-max mx-auto space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">Workers</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">Manage and monitor node pools across the cluster.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-md font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">filter_list</span> Filter
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-4 rounded-lg shadow-sm">
          <div className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-2">Total Workers</div>
          <div className="font-display-lg text-display-lg text-on-surface">{isLoading ? '...' : workers?.length || 0}</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg shadow-sm">
          <div className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-2">Active</div>
          <div className="font-display-lg text-display-lg text-success">{isLoading ? '...' : activeWorkers}</div>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg shadow-sm">
          <div className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-2">Offline</div>
          <div className="font-display-lg text-display-lg text-error">{isLoading ? '...' : offlineWorkers}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">Loading workers...</div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-error">Failed to load workers.</div>
      ) : !workers || workers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">No active workers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
          {workers.map((worker: any) => {
            const isIdle = worker.status === 'IDLE';
            const isOffline = worker.status === 'OFFLINE';
            
            return (
              <div key={worker.id} className={`bg-surface border ${isOffline ? 'border-error/30 opacity-80' : 'border-border'} rounded-lg shadow-sm hover:border-outline-variant transition-colors group flex flex-col`}>
                <div className="p-4 border-b border-border flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-error' : isIdle ? 'bg-warning animate-pulse' : 'bg-success'}`}></span>
                      <h3 className={`font-headline-md text-headline-md text-on-surface font-code-sm ${isOffline ? 'line-through decoration-error/50' : ''}`}>
                        {worker.hostname || worker.id.substring(0, 12)}
                      </h3>
                    </div>
                    <span className={`${isOffline ? 'bg-error/10 text-error border-error/20' : isIdle ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'} font-label-sm text-label-sm px-2 py-0.5 rounded border inline-block`}>
                      {worker.status}
                    </span>
                  </div>
                  <button className="text-on-surface-variant hover:text-on-surface p-1">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                
                <div className="p-4 space-y-4 flex-1">
                  {isOffline ? (
                    <div className="py-4 flex flex-col items-center justify-center text-on-surface-variant h-full">
                      <span className="material-symbols-outlined text-4xl mb-2 opacity-50">cloud_off</span>
                      <span className="font-label-sm text-label-sm text-center">Node unreachable.<br/>Last seen {new Date(worker.updatedAt).toLocaleString()}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-end pt-2">
                        <div>
                          <div className="text-on-surface-variant font-label-sm text-label-sm mb-0.5">Project ID</div>
                          <div className="font-code-sm text-code-sm text-on-surface truncate w-32" title={worker.projectId}>{worker.projectId}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-on-surface-variant font-label-sm text-label-sm mb-0.5">Last Heartbeat</div>
                          <div className="font-code-sm text-code-sm text-on-surface">{new Date(worker.lastHeartbeatAt || worker.updatedAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="px-4 py-3 bg-surface-bright border-t border-border flex justify-end gap-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                  {isOffline ? (
                    <button className="text-primary hover:text-primary-fixed-dim font-label-sm text-label-sm px-2 py-1 border border-transparent hover:border-primary/20 rounded transition-colors">Restart</button>
                  ) : (
                    <>
                      <button className="text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm px-2 py-1 border border-transparent hover:border-border rounded transition-colors">Drain Node</button>
                      <button className="text-error hover:text-error/80 font-label-sm text-label-sm px-2 py-1 border border-transparent hover:border-error/20 rounded transition-colors">Terminate</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Workers;
