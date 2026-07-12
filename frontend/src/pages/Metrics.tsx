import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import api from '../services/api';

const fetchMetricsSeries = async () => {
  const { data } = await api.get('/metrics');
  return data;
};

const fetchMetricsSummary = async () => {
  const { data } = await api.get('/metrics/summary');
  return data;
};

const fetchHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};

const Metrics = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');

  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: fetchMetricsSeries,
    refetchInterval: 30000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: fetchMetricsSummary,
    refetchInterval: 10000,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });


  const totalCompleted = summary?.completed || 0;
  const totalFailed = summary?.failed || 0;
  const grandTotal = totalCompleted + totalFailed;
  const successRate = grandTotal > 0 ? (totalCompleted / grandTotal) * 100 : 100;

  const successData = [
    { name: 'Success', value: successRate, color: '#22C55E' },
    { name: 'Failed', value: 100 - successRate, color: '#EF4444' },
  ];

  const failureRateData = series.map((b: any) => ({
    time: b.time,
    rate: (b.processed + b.failed) > 0 ? Math.round((b.failed / (b.processed + b.failed)) * 100 * 10) / 10 : 0,
  }));

  return (
    <div className="flex-1 p-gutter max-w-container-max mx-auto w-full overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-text-primary">Metrics & Analytics</h2>
          <p className="font-body-md text-body-md text-text-secondary mt-1">Real-time telemetry from PostgreSQL aggregations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex bg-surface border border-border rounded-lg p-1 shadow-sm">
            {(['1h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 font-label-sm text-label-sm rounded-md transition-colors ${timeRange === r ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-container-low text-text-secondary'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['metrics'] })}
            className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-lg font-label-sm text-label-sm text-text-primary hover:bg-surface-container-low transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Completed', value: summaryLoading ? '…' : totalCompleted },
          { label: 'Total Failed', value: summaryLoading ? '…' : totalFailed },
          { label: 'Avg Exec Time', value: summaryLoading ? '…' : (summary?.avgExecMs ? `${(summary.avgExecMs / 1000).toFixed(2)}s` : '—') },
          { label: 'Jobs / Min', value: summaryLoading ? '…' : (summary?.jobsPerMinute?.toFixed(1) ?? '0.0') },
        ].map((c) => (
          <div key={c.label} className="bg-surface border border-border rounded-xl p-4 shadow-sm">
            <div className="text-on-surface-variant font-label-sm text-label-sm uppercase mb-2">{c.label}</div>
            <div className="font-display-lg text-display-lg text-on-surface">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6 pb-6">
        {/* Throughput & Latency */}
        <div className="col-span-12 lg:col-span-8 bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-primary">Throughput & Latency</h3>
            <span className="font-label-sm text-label-sm text-text-secondary">Rolling 60 buckets</span>
          </div>
          <div className="flex-1 h-64 w-full">
            {seriesLoading ? (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">Loading…</div>
            ) : series.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">No data yet — create and complete jobs to populate</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#191c1d', border: 'none', borderRadius: '6px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="processed" stroke="#22C55E" strokeWidth={2} dot={false} name="Completed" />
                  <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} dot={false} name="Failed" />
                  <Line type="monotone" dataKey="latency" stroke="#F59E0B" strokeWidth={2} dot={false} name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Success Rate Donut */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="font-headline-md text-headline-md text-text-primary mb-4">Success Rate</h3>
          <div className="flex-1 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="font-display-lg text-display-lg text-success">{successRate.toFixed(1)}%</span>
              <span className="font-label-sm text-label-sm text-text-secondary">success SLA</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={successData} innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                  {successData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure Rate by Minute */}
        <div className="col-span-12 lg:col-span-6 bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-primary">Failure Rate (%)</h3>
            <span className="font-label-sm text-label-sm text-text-secondary">per minute</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failureRateData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} unit="%" />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#191c1d', border: 'none', borderRadius: '6px', color: '#fff' }} />
                <Bar dataKey="rate" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failure Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Retry Trend */}
        <div className="col-span-12 lg:col-span-6 bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-text-primary">Retry Trend</h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#191c1d', border: 'none', borderRadius: '6px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                <Line type="monotone" dataKey="retried" stroke="#F59E0B" strokeWidth={2} dot={false} name="Retried" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="col-span-12 bg-surface border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-headline-md text-headline-md text-text-primary mb-4">System Health</h3>
          {healthLoading ? (
            <div className="text-on-surface-variant">Checking health…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {health && Object.entries(health.checks).map(([service, check]: [string, any]) => (
                <div key={service} className={`border rounded-xl p-4 flex flex-col justify-between ${check.status === 'ok' ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${check.status === 'ok' ? 'bg-success/10' : 'bg-error/10'}`}>
                      <div className={`w-3 h-3 rounded-full ${check.status === 'ok' ? 'bg-success' : 'bg-error'}`}></div>
                    </div>
                    <h4 className="font-label-md text-label-md text-text-primary capitalize">{service}</h4>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-label-sm text-label-sm text-text-secondary">
                        {check.status === 'ok' ? 'Healthy' : 'Degraded'}
                      </span>
                      {check.latencyMs != null && (
                        <span className="font-headline-md text-headline-md text-text-primary">{check.latencyMs}ms</span>
                      )}
                    </div>
                    {check.detail && (
                      <div className="text-xs text-text-secondary mt-1 truncate" title={check.detail}>{check.detail}</div>
                    )}
                    {check.latencyMs != null && (
                      <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${check.status === 'ok' ? 'bg-success' : 'bg-error'}`} style={{ width: `${Math.min(100, (check.latencyMs / 100) * 100)}%` }}></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Metrics;
