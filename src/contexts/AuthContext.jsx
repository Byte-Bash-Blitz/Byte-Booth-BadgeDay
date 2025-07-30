import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('bb_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('bb_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('bb_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bb_user');
    }
  }, [user]);

  const login = (username, avatar = null) => {
    const userData = {
      id: username.toLowerCase().replace(/\s+/g, '_'),
      username: username.trim(),
      avatar: avatar || generateAvatar(username),
      joinedAt: new Date().toISOString()
    };
    setUser(userData);
    return userData;
  };

  const logout = () => {
    setUser(null);
  };

  const generateAvatar = (username) => {
    // Generate a simple color-based avatar
    const colors = [
      'from-red-400 to-red-600',
      'from-blue-400 to-blue-600', 
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-yellow-400 to-yellow-600',
      'from-teal-400 to-teal-600'
    ];
    
    const colorIndex = username.length % colors.length;
    return {
      type: 'gradient',
      gradient: colors[colorIndex],
      initials: username.slice(0, 2).toUpperCase()
    };
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
