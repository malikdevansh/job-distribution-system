import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const fetchApiKeys = async () => {
  // Use organization's first project for now, or just /projects to get first ID
  const projectsRes = await api.get('/projects');
  if (projectsRes.data.length > 0) {
    const projectId = projectsRes.data[0].id;
    const { data } = await api.get(`/projects/${projectId}/api-keys`);
    return { keys: Array.isArray(data) ? data : [data], projectId };
  }
  return { keys: [], projectId: null };
};

const createApiKey = async (projectId: string) => {
  const { data } = await api.post(`/projects/${projectId}/api-keys`);
  return data;
};

const Settings = () => {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');

  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['api-keys'],
    queryFn: fetchApiKeys,
    retry: false
  });

  const apiKeys = apiData?.keys || [];
  const activeProjectId = apiData?.projectId;

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: () => createApiKey(activeProjectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setSuccessMsg('API Key generated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop custom-scrollbar h-full">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Platform Settings</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage global configuration, security, and API access.</p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* API Keys Card */}
            <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant">vpn_key</span>
                    API Keys
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                    Manage your API keys for authenticating worker nodes and external producers.
                  </p>
                </div>
                <button 
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !activeProjectId}
                  className="px-4 py-2 bg-primary text-on-primary rounded font-label-md text-label-md hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  {mutation.isPending ? 'Generating...' : 'New Key'}
                </button>
              </div>

              {successMsg && (
                <div className="bg-success/10 border border-success/20 text-success p-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {successMsg}
                </div>
              )}

              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-on-surface-variant text-sm p-4 text-center">Loading API keys...</div>
                ) : error ? (
                  <div className="text-error text-sm p-4 text-center">Failed to load API keys.</div>
                ) : !apiKeys || apiKeys.length === 0 ? (
                  <div className="text-on-surface-variant text-sm p-4 text-center border border-dashed border-border rounded-lg">No API keys found.</div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-border">
                          <th className="font-label-sm text-label-sm text-on-surface-variant p-3 font-semibold uppercase tracking-wider">Key</th>
                          <th className="font-label-sm text-label-sm text-on-surface-variant p-3 font-semibold uppercase tracking-wider">Created</th>
                          <th className="font-label-sm text-label-sm text-on-surface-variant p-3 font-semibold uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map((keyObj: any, index: number) => {
                          const keyString = keyObj.key || keyObj;
                          const displayKey = keyString.length > 20 ? `${keyString.substring(0, 10)}...${keyString.substring(keyString.length - 4)}` : keyString;
                          
                          return (
                            <tr key={index} className="border-b border-border last:border-b-0 hover:bg-surface-container-low/50 transition-colors">
                              <td className="p-3">
                                <span className="font-code-sm text-code-sm bg-surface-container-high px-2 py-1 rounded text-on-surface">{displayKey}</span>
                              </td>
                              <td className="p-3 font-body-md text-sm text-on-surface-variant">Just now</td>
                              <td className="p-3 text-right flex justify-end gap-2">
                                <button 
                                  onClick={() => navigator.clipboard.writeText(keyString)}
                                  className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                  title="Copy to clipboard"
                                >
                                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                </button>
                                <button 
                                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors"
                                  title="Revoke key"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Card (Placeholder) */}
            <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
                Profile Information
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Full Name</label>
                  <input className="w-full max-w-md bg-surface border border-border rounded p-2.5 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-outline-variant" defaultValue={profile?.email?.split('@')[0] || ''} type="text"/>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Email Address</label>
                  <input className="w-full max-w-md bg-surface border border-border rounded p-2.5 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-outline-variant" defaultValue={profile?.email || ''} disabled type="email"/>
                </div>
                <button className="px-4 py-2 bg-surface border border-border rounded text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors">
                  Update Profile
                </button>
              </div>
            </div>
            
          </div>

          {/* Side Column */}
          <div className="space-y-6">
            
            {/* Preferences */}
            <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2 border-b border-border pb-4">
                <span className="material-symbols-outlined text-on-surface-variant">tune</span>
                Preferences
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Theme</label>
                  <div className="relative">
                    <select className="w-full bg-surface border border-border rounded p-2.5 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all appearance-none pr-10">
                      <option>System Default</option>
                      <option>Light</option>
                      <option>Dark</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
                
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Timezone</label>
                  <div className="relative">
                    <select className="w-full bg-surface border border-border rounded p-2.5 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all appearance-none pr-10">
                      <option>UTC (Default)</option>
                      <option>America/New_York</option>
                      <option>Europe/London</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface border border-error/30 rounded-lg p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
              <h2 className="font-headline-md text-headline-md text-error mb-2">Danger Zone</h2>
              <p className="font-body-md text-sm text-on-surface-variant mb-4">Irreversible actions for your account and data.</p>
              
              <button className="w-full px-4 py-2 bg-surface border border-error/50 text-error rounded font-label-md text-label-md hover:bg-error/10 transition-colors flex justify-center items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                Delete Account
              </button>
            </div>
            
          </div>
        </div>
        
        <div className="h-12"></div>
      </div>
    </div>
  );
};

export default Settings;
