import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await authAPI.getMe();
        if (me) {
          setUser({ ...me, id: me.id || me.user_id, user_id: me.user_id || me.id });
        }
      } catch (err) {
        console.error('Oturum doğrulanamadı:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.token) {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      if (res.user) {
        setUser({
          ...res.user,
          id: res.user.id || res.user.user_id,
          user_id: res.user.user_id || res.user.id,
        });
      }
      return res;
    }
  };

  const register = async (name, email, password) => {
    return await authAPI.register({ name, email, password });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
