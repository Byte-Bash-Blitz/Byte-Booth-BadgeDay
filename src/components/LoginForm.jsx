import React, { useState } from 'react';
import { User, LogIn, Sparkles } from 'lucide-react';

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      await onLogin(username.trim());
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ backgroundColor: '#0D0B14' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-6">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 animate-pulse-celebration" />
            <h1 className="text-2xl sm:text-4xl font-bold gradient-text">
              Byte Bash Blitz
            </h1>
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-pulse-celebration" />
          </div>
          <p className="text-lg sm:text-xl font-medium mb-2 text-amber-300">
            4th Badge Day Celebration ⚡
          </p>
          <p className="text-sm sm:text-base" style={{ color: 'rgba(212, 175, 55, 0.6)' }}>
            The Sorting Hat awaits your username
          </p>
        </div>

        {/* Login Form Card */}
        <div className="backdrop-blur-sm rounded-2xl p-5 sm:p-8"
             style={{ backgroundColor: 'rgba(26, 22, 40, 0.9)', border: '1px solid rgba(212, 175, 55, 0.3)', boxShadow: '0 0 30px rgba(212, 175, 55, 0.08)' }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'linear-gradient(to right, #f59e0b, #fbbf24)', boxShadow: '0 0 20px rgba(212,175,55,0.35)' }}>
              <User className="w-8 h-8 text-stone-900" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-amber-300 mb-2">
              Enter the Great Hall
            </h2>
            <p className="text-sm" style={{ color: 'rgba(212, 175, 55, 0.55)' }}>
              Enter your wizard name to join the photo feed
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-amber-300">
                Wizard Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name..."
                className="w-full p-4 rounded-lg focus:outline-none text-amber-100 placeholder-amber-900"
                style={{
                  backgroundColor: '#12101C',
                  border: '2px solid rgba(212, 175, 55, 0.25)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(212, 175, 55, 0.7)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(212, 175, 55, 0.25)'}
                maxLength={20}
                required
              />
              <p className="text-xs mt-2" style={{ color: 'rgba(212, 175, 55, 0.4)' }}>
                This will be your display name in the feed
              </p>
            </div>

            <button
              type="submit"
              disabled={!username.trim() || isLoading}
              className="w-full btn-celebration py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-stone-900 border-t-transparent"></div>
                  Casting spell...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <LogIn className="w-5 h-5" />
                  Enter the Hall
                </div>
              )}
            </button>
          </form>

          {/* Quick Join Options */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <p className="text-sm text-center mb-3" style={{ color: 'rgba(212, 175, 55, 0.55)' }}>
              Quick join as:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Gryffindor', color: 'rgba(116, 0, 1, 0.6)', hover: 'rgba(116, 0, 1, 0.85)' },
                { name: 'Slytherin', color: 'rgba(26, 71, 42, 0.6)', hover: 'rgba(26, 71, 42, 0.85)' },
                { name: 'Ravenclaw', color: 'rgba(14, 26, 64, 0.6)', hover: 'rgba(14, 26, 64, 0.85)' },
              ].map(({ name, color }) => (
                <button
                  key={name}
                  onClick={() => setUsername(name)}
                  className="p-2 rounded-lg text-sm font-medium transition-all duration-200 text-amber-200"
                  style={{ backgroundColor: color, border: '1px solid rgba(212,175,55,0.2)' }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: 'rgba(212, 175, 55, 0.35)' }}>
            No password required • Your preferences are saved locally
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
