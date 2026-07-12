import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const fetchQueues = async () => {
  const { data } = await api.get('/queues');
  return data;
};

const CreateJob = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [queueId, setQueueId] = useState('');
  const [payload, setPayload] = useState('{\n  "name": "My New Job",\n  "data": {}\n}');
  const [priority, setPriority] = useState<number>(0);
  const [scheduledAt, setScheduledAt] = useState('');
  const [cron, setCron] = useState('');
  const [jobType, setJobType] = useState<'IMMEDIATE' | 'DELAYED' | 'CRON'>('IMMEDIATE');

  const { data: queues, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: fetchQueues
  });

  const mutation = useMutation({
    mutationFn: async (newJob: any) => {
      const { data } = await api.post('/jobs', newJob);
      return data;
    },
    onSuccess: (data) => {
      toast.success('Job created successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate(`/jobs/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create job');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedPayload = JSON.parse(payload);
      const reqBody: any = { queueId, payload: parsedPayload, priority };
      if (jobType === 'DELAYED' && scheduledAt) {
        reqBody.scheduledAt = new Date(scheduledAt).toISOString();
      }
      if (jobType === 'CRON' && cron) {
        reqBody.cron = cron;
      }
      mutation.mutate(reqBody);
    } catch (err) {
      toast.error('Invalid JSON payload');
    }
  };

  return (
    <div className="flex-1 p-gutter max-w-container-md mx-auto w-full">
      <header className="mb-6 flex items-center gap-4">
        <Link to="/jobs" className="p-1 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant flex items-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="font-display-sm text-display-sm text-on-surface">Create New Job</h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-2">Target Queue</label>
            <select 
              className="w-full bg-surface-container-low border border-border rounded-lg p-2.5 outline-none font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={queueId}
              onChange={(e) => setQueueId(e.target.value)}
              required
            >
              <option value="" disabled>-- Select a Queue --</option>
              {isLoading ? <option disabled>Loading...</option> : queues?.map((q: any) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-2">Priority</label>
            <input 
              type="number"
              className="w-full bg-surface-container-low border border-border rounded-lg p-2.5 outline-none font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
            />
            <p className="mt-1 text-label-sm text-on-surface-variant">Higher numbers execute first (e.g. 10 &gt; 0).</p>
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-2">Execution Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="jobType" value="IMMEDIATE" checked={jobType === 'IMMEDIATE'} onChange={() => setJobType('IMMEDIATE')} className="text-primary focus:ring-primary" />
              <span className="text-body-md">Immediate</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="jobType" value="DELAYED" checked={jobType === 'DELAYED'} onChange={() => setJobType('DELAYED')} className="text-primary focus:ring-primary" />
              <span className="text-body-md">Delayed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="jobType" value="CRON" checked={jobType === 'CRON'} onChange={() => setJobType('CRON')} className="text-primary focus:ring-primary" />
              <span className="text-body-md">Recurring (Cron)</span>
            </label>
          </div>
        </div>

        {jobType === 'DELAYED' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block font-label-md text-label-md text-on-surface mb-2">Scheduled At</label>
            <input 
              type="datetime-local"
              className="w-full bg-surface-container-low border border-border rounded-lg p-2.5 outline-none font-body-md text-on-surface focus:border-primary transition-all"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required={jobType === 'DELAYED'}
            />
          </div>
        )}

        {jobType === 'CRON' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block font-label-md text-label-md text-on-surface mb-2">Cron Expression</label>
            <input 
              type="text"
              placeholder="*/5 * * * *"
              className="w-full bg-surface-container-low border border-border rounded-lg p-2.5 outline-none font-body-md text-on-surface focus:border-primary transition-all font-code-sm"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              required={jobType === 'CRON'}
            />
            <p className="mt-1 text-label-sm text-on-surface-variant">Standard cron format (e.g. "0 * * * *" for hourly)</p>
          </div>
        )}
        
        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-2">Payload (JSON)</label>
          <textarea 
            className="w-full bg-inverse-surface border border-outline-variant rounded-lg p-3 outline-none font-code-sm text-inverse-on-surface min-h-[200px] focus:border-primary"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-border mt-2">
          <button 
            type="submit" 
            disabled={mutation.isPending || !queueId}
            className="bg-primary text-on-primary py-2 px-6 rounded-lg font-label-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-opacity"
          >
            {mutation.isPending && <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>}
            {jobType === 'CRON' ? 'Create Scheduled Job' : 'Dispatch Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
