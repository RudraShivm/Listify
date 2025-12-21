
import React from 'react';
import { useStore } from '../context/Store';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const ToastContainer = () => {
    const { toasts, removeToast } = useStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <div 
                    key={toast.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right duration-300 min-w-[300px]
                        ${toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 
                          toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 
                          'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'}
                    `}
                >
                    {toast.type === 'success' && <CheckCircle size={18} className="text-green-600"/>}
                    {toast.type === 'error' && <AlertCircle size={18} className="text-red-600"/>}
                    {toast.type === 'info' && <Info size={18} className="text-blue-600"/>}
                    
                    <span className="text-sm font-medium flex-1">{toast.message}</span>
                    
                    <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100">
                        <X size={16}/>
                    </button>
                </div>
            ))}
        </div>
    );
};
