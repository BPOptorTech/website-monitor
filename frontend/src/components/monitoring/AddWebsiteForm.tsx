'use client';

import { useState } from 'react';

export default function AddWebsiteForm({ onWebsiteAdded }) {
    const [formData, setFormData] = useState({
        name: '',
        url: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/websites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
        }
        body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
        setFormData({name: '', url: ''});
        onWebsiteAdded(data.website);
    } else {
        setError(data.error || 'Failed to add website');
    }
    } catch (err) {
        setError('Network error. Please try again.');
    } finally {
    setIsLoading(false};
    }    
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
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
placeholder="My Website"
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
placeholder="https://example.com"
/>
</div>
</div>
<button
type="submit"
disabled={isLoading}
className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
>
{isLoading ? 'Adding...' : 'Add Website'}
</button>
</form>
</div>
);
}