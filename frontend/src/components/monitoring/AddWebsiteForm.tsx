'use client';
import { useState } from 'react';

export default function AddWebsiteForm({ onWebsiteAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    url: ''
  });
  const [alertEmails, setAlertEmails] = useState(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Filter out empty emails
      const validEmails = alertEmails.filter(email => email.trim() !== '');
      
      const response = await fetch('http://localhost:3001/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          alertEmails: validEmails
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormData({ name: '', url: '' });
        setAlertEmails(['']);
        onWebsiteAdded({
          id: data.data.id,
          name: formData.name,
          url: formData.url,
          alertEmails: validEmails
        });
      } else {
        setError(data.error || 'Failed to add website');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addEmailField = () => {
    setAlertEmails([...alertEmails, '']);
  };

  const removeEmailField = (index) => {
    if (alertEmails.length > 1) {
      const newEmails = alertEmails.filter((_, i) => i !== index);
      setAlertEmails(newEmails);
    }
  };

  const updateEmail = (index, value) => {
    const newEmails = [...alertEmails];
    newEmails[index] = value;
    setAlertEmails(newEmails);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Add Website to Monitor</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Website Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Trinity Hearing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://www.trinityhearing.com"
            />
          </div>
        </div>

        {/* Alert Email Configuration */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Alert Email Addresses
            </label>
            <span className="text-xs text-gray-500">
              Receive notifications when issues are detected
            </span>
          </div>
          
          <div className="space-y-3">
            {alertEmails.map((email, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="email"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  placeholder="admin@trinityhearing.com"
                />
                {alertEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmailField(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 focus:outline-none"
                    title="Remove email"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addEmailField}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            + Add another email address
          </button>
        </div>

        {/* Monitoring Features Preview */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            🚀 Enterprise Monitoring Features Included:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
            <div>✅ 24/7 Uptime Monitoring (5-minute checks)</div>
            <div>🔒 SSL Certificate Monitoring & Alerts</div>
            <div>📊 Performance & Response Time Tracking</div>
            <div>⚡ Instant Email Alerts for Issues</div>
            <div>📈 Security Grade Assessment (A+ to F)</div>
            <div>📅 SSL Expiry Warnings (30/7/1 days)</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Monitoring starts automatically within 5 minutes
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Adding...' : 'Start Monitoring'}
          </button>
        </div>
      </form>
    </div>
  );
}