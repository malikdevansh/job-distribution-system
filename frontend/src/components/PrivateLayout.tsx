import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const PrivateLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Organizations', path: '/organizations', icon: 'corporate_fare' },
    { name: 'Projects', path: '/projects', icon: 'folder' },
    { name: 'Queues', path: '/queues', icon: 'format_list_bulleted' },
    { name: 'Jobs', path: '/jobs', icon: 'analytics' },
    { name: 'Workers', path: '/workers', icon: 'engineering' },
    { name: 'Scheduler', path: '/scheduler', icon: 'schedule' },
  ];

  return (
    <div className="text-on-surface flex h-screen overflow-hidden font-body-md bg-background">
      {/* SideNavBar */}
      <aside className="hidden md:flex flex-col h-screen sticky left-0 top-0 w-64 border-r border-border dark:border-outline-variant bg-surface dark:bg-inverse-surface z-50">
        <div className="flex flex-col h-full py-6">
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[20px]">layers</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim leading-tight">Enterprise Scheduler</h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Production Cluster</p>
            </div>
          </div>
          
          <div className="px-4 mb-6">
            <Link to="/jobs/new" className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-2 px-4 rounded hover:bg-primary transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Job
            </Link>
          </div>
          
          <nav className="flex-1 overflow-y-auto font-label-md text-label-md">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <li key={item.path}>
                    <Link 
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2 transition-colors duration-200 ${
                        isActive 
                        ? 'text-primary dark:text-primary-fixed-dim bg-secondary-container/50 dark:bg-secondary/20 font-bold border-r-4 border-primary opacity-90' 
                        : 'text-on-surface-variant dark:text-surface-variant hover:text-primary hover:bg-surface-container-low dark:hover:bg-surface-dim'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          <div className="mt-auto pt-4 border-t border-border dark:border-outline-variant px-4">
            <ul className="space-y-1 font-label-md text-label-md">
              <li>
                <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-on-surface-variant dark:text-surface-variant hover:text-primary hover:bg-surface-container-low dark:hover:bg-surface-dim transition-colors duration-200">
                  <span className="material-symbols-outlined">settings</span>
                  Settings
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant dark:text-surface-variant hover:text-error hover:bg-error-container/20 dark:hover:bg-surface-dim transition-colors duration-200 text-left">
                  <span className="material-symbols-outlined">logout</span>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopNavBar */}
        <header className="docked full-width top-0 sticky z-40 bg-surface/80 dark:bg-inverse-surface/80 backdrop-blur-md shadow-sm">
          <div className="flex justify-between items-center w-full px-gutter h-16 max-w-container-max mx-auto">
            <div className="flex items-center gap-6">
              <div className="md:hidden">
                <span className="material-symbols-outlined text-primary cursor-pointer text-[24px]">menu</span>
              </div>
              <h2 className="font-headline-md text-headline-md font-black text-on-surface dark:text-inverse-on-surface hidden md:block">Scheduler Console</h2>
              
              {/* Search Bar */}
              <div className="relative hidden sm:block w-64 ml-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
                <input 
                  type="text" 
                  placeholder="Search jobs, workers..." 
                  className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-border rounded font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" 
                />
              </div>
            </div>
            
            <div className="flex items-center gap-6 font-label-sm text-label-sm">
              <nav className="hidden lg:flex items-center gap-6">
                <a href="#" className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 rounded-lg px-2 py-1 transition-colors">Documentation</a>
                <a href="#" className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 rounded-lg px-2 py-1 transition-colors">API Reference</a>
                <a href="#" className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 rounded-lg px-2 py-1 transition-colors">Status</a>
              </nav>
              <div className="flex items-center gap-4 border-l border-border pl-6">
                <button className="bg-surface border border-border text-on-surface hover:bg-surface-container-low px-4 py-1.5 rounded font-label-md text-label-md transition-colors hidden sm:block">
                  Deploy Worker
                </button>
                <div className="flex items-center gap-2 text-outline-variant">
                  <button className="hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-low">
                    <span className="material-symbols-outlined">notifications</span>
                  </button>
                  <button className="hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-low">
                    <span className="material-symbols-outlined">account_circle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PrivateLayout;
