import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // First check if we have a session in cookies
        const storedUser = Cookies.get('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsAuthenticated(true);
            console.log('Restored user from cookies:', parsedUser.email);
          } catch (e) {
            console.error('Failed to parse stored user:', e);
            Cookies.remove('user', { path: '/' });
          }
        }

        // Then get the current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session retrieval error:', error);
          Cookies.remove('user', { path: '/' });
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        if (session?.user) {
          console.log('Found active session for:', session.user.email);
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            token: session.access_token
          };
          setUser(userData);
          setIsAuthenticated(true);
          
          // Update cookies with fresh session data
          Cookies.set('user', JSON.stringify(userData), { 
            expires: 30,
            secure: false, // 开发环境设为 false
            sameSite: 'lax',
            path: '/'
          });
        } else {
          console.log('No active session found');
          // No valid session found
          Cookies.remove('user', { path: '/' });
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        Cookies.remove('user', { path: '/' });
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        Cookies.remove('user', { path: '/' });
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      if (session?.user) {
        console.log('User signed in:', session.user.email);
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          token: session.access_token
        };
        setUser(userData);
        setIsAuthenticated(true);
        
        // Update cookies on session change
        Cookies.set('user', JSON.stringify(userData), { 
          expires: 30,
          secure: false, // 开发环境设为 false
          sameSite: 'lax',
          path: '/'
        });
      } else {
        Cookies.remove('user', { path: '/' });
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      
      // First try to sign in with Supabase auth
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        
        // 处理特定错误
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('邮箱或密码错误，请检查后重试');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('邮箱未验证，请检查邮箱并点击验证链接');
        } else if (authError.message.includes('Too many requests')) {
          throw new Error('登录尝试过于频繁，请稍后再试');
        } else {
          throw new Error(authError.message || '登录失败，请稍后重试');
        }
      }

      if (!session?.user) {
        throw new Error('登录失败，未获取到用户信息');
      }

      console.log('Login successful for:', session.user.email);

      // If successful, create user data
      const userData: User = {
        id: session.user.id,
        email: session.user.email || '',
        token: session.access_token
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // Set cookies with proper options
      Cookies.set('user', JSON.stringify(userData), { 
        expires: 30,
        secure: false, // 开发环境设为 false
        sameSite: 'lax',
        path: '/'
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await supabase.auth.signOut();
      Cookies.remove('user', { path: '/' });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};