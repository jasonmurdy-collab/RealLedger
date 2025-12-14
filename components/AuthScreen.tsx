import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowRight, UserPlus, Fingerprint } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('agent@realledger.ca');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuthAction = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (isSignUp) {
      // Handle Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        setSuccessMessage('Success! Please check your email for a confirmation link to activate your account.');
      }
    } else {
      // Handle Sign In
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccessMessage(null);
  };


  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>

      <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center border border-white/10 shadow-2xl mb-8 relative z-10">
        <span className="text-3xl font-bold text-white tracking-tighter">RL</span>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2 text-center">RealLedger</h1>
      <p className="text-zinc-500 mb-12 text-center max-w-xs">The Wealth Operating System for Canadian Real Estate Professionals.</p>

      <div className="w-full max-w-sm space-y-4 relative z-10">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 ml-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500/50 transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500/50 transition-colors"
          />
        </div>

        {error && (
            <p className="text-xs text-rose-500 text-center bg-rose-500/10 p-2 rounded-lg">{error}</p>
        )}
        
        {successMessage && (
            <p className="text-xs text-emerald-500 text-center bg-emerald-500/10 p-2 rounded-lg">{successMessage}</p>
        )}

        <button 
          onClick={handleAuthAction}
          disabled={loading || !!successMessage}
          className="w-full bg-white text-black font-bold py-3.5 rounded-xl shadow-lg hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
          ) : (
            <>
              {isSignUp ? 'Create Account' : 'Sign In'}
              {isSignUp ? <UserPlus size={18} /> : <ArrowRight size={18} />}
            </>
          )}
        </button>
        
        <p className="text-center text-xs text-zinc-500">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button onClick={toggleAuthMode} className="font-bold text-rose-500 hover:text-rose-400 ml-1">
                {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
        </p>

        {!isSignUp && (
            <div className="flex items-center justify-center gap-4 mt-6">
                <button className="p-3 rounded-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors text-zinc-400">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                </button>
                <button className="p-3 rounded-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 transition-colors text-white">
                    <Fingerprint size={20} />
                </button>
            </div>
        )}
      </div>
      
      <p className="mt-12 text-xs text-zinc-600 text-center">
        Secured by Supabase Auth.<br/>Bank-grade encryption.
      </p>
    </div>
  );
};