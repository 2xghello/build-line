import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

// ============================================================================
// AUTH CONTEXT
// ============================================================================

const AuthContext = createContext(null);

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  admin: 5,
  supervisor: 4,
  qc: 3,
  technician: 2,
  sales: 1,
};

// Default routes per role
const DEFAULT_ROUTES = {
  admin: '/admin/dashboard',
  supervisor: '/supervisor/dashboard',
  technician: '/technician/dashboard',
  qc: '/qc/dashboard',
  sales: '/sales/dashboard',
};

// ============================================================================
// AUTH PROVIDER
// ============================================================================

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --------------------------------------------------------------------------
  // Fetch user profile from profiles table
  // --------------------------------------------------------------------------
  const fetchProfile = useCallback(async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_code,
          full_name,
          email,
          phone,
          status,
          created_at,
          roles (
            id,
            name,
            description,
            permissions
          )
        `)
        .eq('auth_id', authUser.id)
        .single();

      if (error) throw error;

      if (data.status !== 'active') {
        throw new Error('Account is not active. Please contact administrator.');
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
  // Initialize auth state
  // --------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Session refreshed, no action needed
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // --------------------------------------------------------------------------
  // Login with user code (looks up email first)
  // --------------------------------------------------------------------------
  const loginWithUserCode = async (userCode, password) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Look up email by user_code
      const { data: profileData, error: lookupError } = await supabase
        .from('profiles')
        .select('email, status')
        .eq('user_code', userCode.toUpperCase())
        .single();

      if (lookupError || !profileData) {
        throw new Error('Invalid user ID. Please check and try again.');
      }

      if (profileData.status !== 'active') {
        throw new Error('Account is not active. Please contact administrator.');
      }

      // Step 2: Sign in with email and password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: password,
      });

      if (signInError) {
        throw new Error('Invalid password. Please try again.');
      }

      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Login with email (alternative method)
  // --------------------------------------------------------------------------
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (err) {
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
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setRole(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Permission checks
  // --------------------------------------------------------------------------
  const hasRole = useCallback((requiredRole) => {
    if (!role) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    return role === requiredRole;
  }, [role]);

  const hasMinimumRole = useCallback((minimumRole) => {
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
  }, [role]);

  const isAdmin = useCallback(() => role === 'admin', [role]);
  const isSupervisor = useCallback(() => role === 'supervisor', [role]);
  const isTechnician = useCallback(() => role === 'technician', [role]);
  const isQC = useCallback(() => role === 'qc', [role]);
  const isSales = useCallback(() => role === 'sales', [role]);

  // --------------------------------------------------------------------------
  // Get default route for current user
  // --------------------------------------------------------------------------
  const getDefaultRoute = useCallback(() => {
    return DEFAULT_ROUTES[role] || '/login';
  }, [role]);

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

    // Auth methods
    loginWithUserCode,
    loginWithEmail,
    logout,
    clearError,

    // Role checks
    hasRole,
    hasMinimumRole,
    isAdmin,
    isSupervisor,
    isTechnician,
    isQC,
    isSales,

    // Helpers
    getDefaultRoute,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
