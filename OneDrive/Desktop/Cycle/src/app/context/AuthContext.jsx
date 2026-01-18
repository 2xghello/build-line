import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@services/supabase';

// ============================================================================
// AUTH CONTEXT
// ============================================================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --------------------------------------------------------------------------
  // Fetch user profile from database
  // --------------------------------------------------------------------------
  const fetchProfile = useCallback(async (authId) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          auth_id,
          full_name,
          user_code,
          status,
          role_id,
          roles (
            id,
            name,
            description
          )
        `)
        .eq('auth_id', authId)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!data) {
        throw new Error('Profile not found');
      }

      if (data.status !== 'active') {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      setProfile(data);
      setRole(data.roles?.name || null);
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
      return null;
    }
  }, []);

  // --------------------------------------------------------------------------
  // Initialize auth state on mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // --------------------------------------------------------------------------
  // Login with user_code and password
  // --------------------------------------------------------------------------
  const login = async (userId, password) => {
    try {
      setLoading(true);
      setError(null);

      // First, find the user's email by their user_code
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('auth_id, status')
        .eq('user_code', userId.toUpperCase())
        .single();

      if (profileError || !profileData) {
        throw new Error('Invalid user ID or password');
      }

      if (profileData.status !== 'active') {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      // Get the user's email from auth.users via the auth_id
      // We need to sign in using email, so we construct it from user_code
      // Convention: user_code@cycle.local (internal email format)
      const email = `${userId.toLowerCase()}@cycle.local`;

      // Attempt to sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error('Invalid user ID or password');
      }

      setUser(data.user);
      await fetchProfile(data.user.id);

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setUser(null);
      setProfile(null);
      setRole(null);

      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Clear error
  // --------------------------------------------------------------------------
  const clearError = () => setError(null);

  // --------------------------------------------------------------------------
  // Context value
  // --------------------------------------------------------------------------
  const value = {
    // State
    user,
    profile,
    role,
    loading,
    error,
    isAuthenticated: !!user && !!profile,

    // User info shortcuts
    userId: profile?.user_code || null,
    userName: profile?.full_name || null,

    // Actions
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
