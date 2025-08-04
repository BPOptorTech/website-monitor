'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        setUser(JSON.parse(userData));
}, [router]);

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
                <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Your Websites</h2>
                <p className="text-gray-600">
                    No websites being monitored yet. Add your first website to get started!
                </p>
                </div>
            </div>
            </div>
        );
        }
