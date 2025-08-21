'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddWebsiteForm from '@/components/monitoring/AddWebsiteForm';
import { RealtimeMonitor } from '@/components/RealtimeMonitor';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const handleWebsiteAdded = (newWebsite) => {
    setWebsites([...websites, newWebsite]);
  };

  // First useEffect: Handle authentication
  useEffect(() => {
    console.log('Auth useEffect running');  // ADD THIS LINE
    const authToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
   
    if (!authToken || !userData) {
      router.push('/login');
      return;
    }
   
    setUser(JSON.parse(userData));
    setToken(authToken);
  }, [router]);

  // Second useEffect: Fetch websites when user is loaded
  useEffect(() => {
    console.log('useEffect triggered - user:', user, 'token:', !!token); 
    const fetchWebsites = async () => {
      console.log('fetchWebsites called - about to make API request');  // ADD THIS LINE
      if (!user || !token) return;
     
      try {
        const response = await fetch(`http://localhost:3001/api/websites?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('API response:', response.status, response.ok);  // ADD THIS LINE
       
        if (response.ok) {
          const data = await response.json();
          console.log('API data received:', data);  // ADD THIS LINE
          setWebsites(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch websites:', error);
      }
    };
    fetchWebsites();
  }, [user, token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-100 text-green-800';
      case 'down': return 'bg-red-100 text-red-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastChecked = (lastChecked: string) => {
    if (!lastChecked) return 'Never';
    const date = new Date(lastChecked);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard
            </h1>
            <div className="text-sm text-gray-600">
              Welcome, {user.first_name}!
            </div>
          </div>
        </div>
      </div>
     
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Real-time Monitoring Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Real-time Monitoring</h2>
              <p className="text-sm text-gray-600 mt-1">
                Live updates from your website monitoring service
              </p>
            </div>
            <div className="p-6">
              <RealtimeMonitor token={token} />
            </div>
          </div>
        </div>

        {/* Add Website Form */}
        <div className="mb-8">
          <AddWebsiteForm onWebsiteAdded={handleWebsiteAdded} />
        </div>
       
        {/* Websites List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Websites</h2>
            <p className="text-sm text-gray-600 mt-1">
              {websites.length} website{websites.length !== 1 ? 's' : ''} being monitored
            </p>
          </div>
          
          <div className="p-6">
            {websites.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg">
                  No websites being monitored yet
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Add your first website above to start monitoring!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {websites.map((website, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{website.name}</h3>
                          {website.status && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(website.status)}`}>
                              {website.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{website.url}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>Last checked: {formatLastChecked(website.last_checked)}</span>
                          {website.check_interval && (
                            <span>Every {Math.round(website.check_interval / 60)} minutes</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          onClick={() => {
                            // TODO: Add view details functionality
                            console.log('View details for', website.name);
                          }}
                        >
                          View Details
                        </button>
                        <button 
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            // TODO: Add more options
                            console.log('More options for', website.name);
                          }}
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}