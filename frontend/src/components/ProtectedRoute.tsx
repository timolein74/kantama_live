import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  // DEMO MODE: Check token from localStorage - try both locations
  let token = localStorage.getItem('token');
  const authStorage = localStorage.getItem('auth-storage');
  
  // If direct token is null, try to get it from auth-storage
  if (!token && authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      if (parsed?.state?.token) {
        token = parsed.state.token;
        // Also restore the direct token
        localStorage.setItem('token', token);
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  // No token = not authenticated
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // If we have a demo token, extract role from it
  if (token.startsWith('demo-token-')) {
    const demoRole = token.replace('demo-token-', '').toUpperCase() as UserRole;
    
    if (allowedRoles.includes(demoRole)) {
      return <Outlet />;
    } else {
      // Redirect to appropriate dashboard based on demo role
      switch (demoRole) {
        case 'ADMIN':
          return <Navigate to="/admin" replace />;
        case 'FINANCIER':
          return <Navigate to="/financier" replace />;
        case 'CUSTOMER':
          return <Navigate to="/dashboard" replace />;
        default:
          return <Navigate to="/" replace />;
      }
    }
  }

  // For non-demo tokens, try to get role from auth-storage
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const userRole = parsed?.state?.user?.role as UserRole | undefined;
      
      if (userRole) {
        if (allowedRoles.includes(userRole)) {
          return <Outlet />;
        } else {
          // Redirect to appropriate dashboard based on role
          switch (userRole) {
            case 'ADMIN':
              return <Navigate to="/admin" replace />;
            case 'FINANCIER':
              return <Navigate to="/financier" replace />;
            case 'CUSTOMER':
              return <Navigate to="/dashboard" replace />;
            default:
              return <Navigate to="/" replace />;
          }
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Fallback: token exists but we can't determine role - go to login
  return <Navigate to="/login" replace />;
}


