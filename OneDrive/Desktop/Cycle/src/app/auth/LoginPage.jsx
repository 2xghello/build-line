import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { Bike, AlertCircle, Loader2 } from 'lucide-react';
import './LoginPage.css';

// ============================================================================
// ROLE-BASED REDIRECT PATHS
// ============================================================================

const ROLE_REDIRECTS = {
  admin: '/admin/dashboard',
  supervisor: '/supervisor/dashboard',
  technician: '/technician/dashboard',
  qc: '/qc/dashboard',
  sales: '/sales/dashboard',
};

// ============================================================================
// LOGIN PAGE
// ============================================================================

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role, loading, error, clearError } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && role) {
      const redirectPath = ROLE_REDIRECTS[role] || '/login';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // Clear errors when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [userId, password]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId.trim() || !password.trim()) {
      return;
    }

    setIsSubmitting(true);

    const result = await login(userId.trim(), password);

    if (result.success) {
      // Navigation will be handled by the useEffect above
    }

    setIsSubmitting(false);
  };

  // Show loading screen during initial auth check
  if (loading && !isSubmitting) {
    return (
      <div className="login-page">
        <div className="login-loading">
          <Loader2 className="spinner" size={40} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <Bike size={48} />
          </div>
          <h1>Cycle Assembly</h1>
          <p>Management System</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              placeholder="e.g., ADM001, SUP001"
              disabled={isSubmitting}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting || !userId.trim() || !password.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="button-spinner" size={20} />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer">
          Contact administrator for access
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
