// Unauthorized access page — shown when user lacks required permissions
import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 p-6">
      <h1 className="text-4xl font-bold mb-4">Unauthorized Access</h1>
      <p className="text-lg mb-6 text-slate-600 dark:text-gray-400">You do not have permission to view this page.</p>
      <Link
        to="/"
        className="px-6 py-3 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
      >
        Go Home
      </Link>
    </div>
  );
};

export default UnauthorizedPage;