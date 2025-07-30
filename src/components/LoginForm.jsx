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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="w-8 h-8 text-green-400" />
            <h1 className="text-4xl font-bold gradient-text">
              Byte Bash Blitz
            </h1>
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-xl text-gray-300 font-medium mb-2">
            3rd Badge Day Celebration 🏆
          </p>
          <p className="text-gray-400">
            Join the photo feed with your username
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to the Feed
            </h2>
            <p className="text-gray-400 text-sm">
              Enter your username to start sharing and liking photos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username..."
                className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-green-400 focus:outline-none text-white placeholder-gray-500"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
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
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Joining...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <LogIn className="w-5 h-5" />
                  Join the Feed
                </div>
              )}
            </button>
          </form>

          {/* Quick Join Options */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center mb-3">
              Quick join as:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {['Rookie', 'Basher', 'Pro'].map((name) => (
                <button
                  key={name}
                  onClick={() => setUsername(name)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            No password required • Your preferences are saved locally
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
