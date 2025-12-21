import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Layout, Mail, Lock, Loader2, ArrowRight, AlertTriangle, ExternalLink } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    
    setLoading(true);
    setMessage(null);

    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else if (isSignUp) {
      setMessage({ text: 'Check your email for the confirmation link!', type: 'success' });
    }
    setLoading(false);
  };

  // If Supabase isn't configured, show a setup screen instead of crashing
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark rounded-3xl shadow-2xl p-8 border border-red-100 dark:border-red-900/30 text-center space-y-6">
          <div className="inline-flex p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-500">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supabase Setup Required</h1>
          <p className="text-gray-500 text-sm">
            To enable cloud sync and authentication, you need to provide your Supabase credentials in the environment variables.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-left font-mono text-xs space-y-2 overflow-x-auto">
            <p>VITE_SUPABASE_URL=your_project_url</p>
            <p>VITE_SUPABASE_ANON_KEY=your_anon_key</p>
          </div>
          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-primary font-medium hover:underline"
          >
            Go to Supabase Dashboard <ExternalLink size={14} />
          </a>
          <p className="text-[10px] text-gray-400">
            Check README.md for the required SQL schema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4 text-primary">
            <Layout size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Listify</h1>
          <p className="text-gray-500">Synchronize your scholarly life across devices.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="name@university.edu"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Create Account' : 'Sign In')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-primary hover:underline font-medium"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
