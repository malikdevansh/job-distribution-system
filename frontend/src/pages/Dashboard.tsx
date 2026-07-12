import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api, { WS_BASE_URL } from '../services/api';
import { useWebSockets } from '../hooks/useWebSockets';
import { useAuthStore } from '../store/auth';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const { isConnected, lastMessage } = useWebSockets(WS_BASE_URL, token);

  // Invalidate relevant caches on any WS message
  useEffect(() => {
    if (!lastMessage) return;
    const { event } = lastMessage;
    if (!event) return;
    if (event.startsWith('job') || event === 'dashboard:updated') {
      queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    }
    if (event.startsWith('worker')) {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    }
  }, [lastMessage, queryClient]);

  // KPI summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: async () => {
      const { data } = await api.get('/metrics/summary');
      return data;
    },
    refetchInterval: 10000,
  });

  // Rolling time-series for charts
  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get('/metrics');
      return data;
    },
    refetchInterval: 30000,
  });

  // Workers list
  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data } = await api.get('/workers');
      return data;
    },
    refetchInterval: 15000,
  });

  // Queue depth from summary
  const queueDepthData = summary?.queueDepth?.slice(0, 8) || [];

  const s = summaryLoading ? null : summary;

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <div className="flex items-center text-outline font-label-sm text-label-sm mb-1 gap-1">
            <span className="hover:text-primary cursor-pointer">Cluster</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface">Dashboard</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface flex items-center gap-3">
            Cluster Overview
            {isConnected ? (
              <span className="bg-success/10 text-success text-[12px] px-2 py-0.5 rounded-full font-label-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> WebSocket Live
              </span>
            ) : (
              <span className="bg-error/10 text-error text-[12px] px-2 py-0.5 rounded-full font-label-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Reconnecting…
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-label-sm font-label-sm">
          <span className="text-outline-variant">Live — auto-refreshing</span>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['metrics-summary'] });
              queryClient.invalidateQueries({ queryKey: ['metrics'] });
              queryClient.invalidateQueries({ queryKey: ['workers'] });
            }}
            className="text-primary hover:text-primary-fixed p-1 rounded hover:bg-primary/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Row 1 KPI — Job Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {[
          { label: 'Running', value: s?.running, icon: 'play_circle', color: 'text-primary', border: 'border-primary/20' },
          { label: 'Queued', value: s?.queued, icon: 'queue', color: 'text-info', border: 'border-border' },
          { label: 'Scheduled', value: s?.scheduled, icon: 'schedule', color: 'text-warning', border: 'border-border' },
          { label: 'Completed', value: s?.completed, icon: 'check_circle', color: 'text-success', border: 'border-success/20' },
        ].map((card) => (
          <div key={card.label} className={`bg-surface border ${card.border} rounded-lg p-4 hover:border-outline-variant transition-colors relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className={`material-symbols-outlined text-[48px] ${card.color}`}>{card.icon}</span>
            </div>
            <h3 className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">{card.label}</h3>
            <span className="font-display-lg text-display-lg text-on-surface">
              {summaryLoading ? '…' : (card.value ?? 0)}
            </span>
          </div>
        ))}
      </div>

      {/* Row 2 KPI — Failures + Workers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Failed', value: s?.failed, icon: 'error', color: 'text-error', border: 'border-error/20' },
          { label: 'Retries', value: s?.retryPending, icon: 'replay', color: 'text-warning', border: 'border-warning/20' },
          { label: 'Dead Letter', value: s?.deadLetter, icon: 'delete_forever', color: 'text-error', border: 'border-error/30' },
          { label: 'Active Workers', value: s?.activeWorkers, icon: 'engineering', color: 'text-success', border: 'border-success/20', sub: `${s?.totalWorkers ?? 0} total` },
        ].map((card) => (
          <div key={card.label} className={`bg-surface border ${card.border} rounded-lg p-4 hover:border-outline-variant transition-colors relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className={`material-symbols-outlined text-[48px] ${card.color}`}>{card.icon}</span>
            </div>
            <h3 className={`font-label-sm text-label-sm mb-1 uppercase tracking-wider ${card.label === 'Failed' || card.label === 'Dead Letter' ? 'text-error' : 'text-outline'}`}>{card.label}</h3>
            <span className={`font-display-lg text-display-lg ${card.label === 'Failed' || card.label === 'Dead Letter' ? 'text-error' : 'text-on-surface'}`}>
              {summaryLoading ? '…' : (card.value ?? 0)}
            </span>
            {card.sub && <div className="text-outline-variant font-label-sm text-label-sm mt-0.5">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Row 3 KPI — Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Jobs / Minute', value: summaryLoading ? '…' : (s?.jobsPerMinute?.toFixed(1) ?? '0.0') },
          { label: 'Avg Exec Time', value: summaryLoading ? '…' : (s?.avgExecMs ? `${(s.avgExecMs / 1000).toFixed(1)}s` : '—') },
          { label: 'Avg Queue Wait', value: summaryLoading ? '…' : (s?.avgWaitMs ? `${(s.avgWaitMs / 1000).toFixed(1)}s` : '—') },
          { label: 'Worker Util.', value: summaryLoading ? '…' : `${s?.workerUtilization ?? 0}%` },
        ].map((card) => (
          <div key={card.label} className="bg-surface border border-border rounded-lg p-4 hover:border-outline-variant transition-colors">
            <h3 className="font-label-sm text-label-sm text-outline mb-1 uppercase tracking-wider">{card.label}</h3>
            <span className="font-display-lg text-display-lg text-on-surface">{card.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Throughput Timeline */}
        <div className="bg-surface border border-border rounded-lg p-5 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">Throughput Timeline</h3>
            <span className="font-label-sm text-label-sm text-outline-variant">Rolling 60 min</span>
          </div>
          <div className="flex-1 min-h-[220px]">
            {seriesLoading ? (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">Loading chart…</div>
            ) : series.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">No data yet — jobs will appear here as they complete</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.2)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#191c1d', border: 'none', borderRadius: '6px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="processed" stroke="#22C55E" strokeWidth={2} dot={false} name="Completed" />
                  <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} dot={false} name="Failed" />
                  <Line type="monotone" dataKey="retried" stroke="#F59E0B" strokeWidth={2} dot={false} name="Retried" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Queue Depth */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col">
          <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-4">Queue Depth</h3>
          <div className="flex-1 min-h-[220px]">
            {summaryLoading ? (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">Loading…</div>
            ) : queueDepthData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">All queues empty</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queueDepthData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128,128,128,0.2)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis type="category" dataKey="queueId" width={80} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 9 }} tickFormatter={(v: string) => v.slice(0, 8) + '…'} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#191c1d', border: 'none', borderRadius: '6px', color: '#fff' }} />
                  <Bar dataKey="depth" fill="#2563eb" radius={[0, 4, 4, 0]} name="Jobs in Queue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Workers Quick View */}
      {workers.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-4">Worker Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {workers.slice(0, 8).map((w: any) => {
              const alive = w.status !== 'OFFLINE' && w.status !== 'STOPPED';
              const lastSeen = w.lastHeartbeatAt
                ? Math.floor((Date.now() - new Date(w.lastHeartbeatAt).getTime()) / 1000)
                : null;
              return (
                <div key={w.id} className={`border rounded-md p-3 flex items-center gap-3 ${alive ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${alive ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
                  <div className="min-w-0">
                    <div className="font-label-sm text-label-sm text-on-surface truncate">{w.hostname || w.id.slice(0, 12)}</div>
                    <div className="text-xs text-outline-variant">
                      {w.status} {lastSeen != null ? `· ${lastSeen}s ago` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
