import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Queues from './pages/Queues';
import Workers from './pages/Workers';
import JobDetail from './pages/JobDetail';
import DLQBrowser from './pages/DLQBrowser';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';
import CreateJob from './pages/CreateJob';
import Jobs from './pages/Jobs';
import Scheduler from './pages/Scheduler';
import Organizations from './pages/Organizations';
import Projects from './pages/Projects';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import PrivateLayout from './components/PrivateLayout';
import { useAuthStore } from './store/auth';

const App = () => {
  const token = useAuthStore((state) => state.token);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={token ? <Navigate to="/" replace /> : <Register />} 
        />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<PrivateLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/new" element={<CreateJob />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/dlq" element={<DLQBrowser />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
