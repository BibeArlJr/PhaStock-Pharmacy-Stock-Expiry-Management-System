import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import FullScreenLoader from '@/components/FullScreenLoader';
import InlineSpinner from '@/components/InlineSpinner';
import PasswordInput from '@/components/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setToken, setUser, isAuthLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthLoading && token) {
    return <FullScreenLoader label="Restoring session" />;
  }

  if (token && !isAuthLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      toast.error('Email or phone and password are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      const tokenValue = response.data?.data?.token;
      const loginUser = response.data?.data?.user || null;
      const pharmacy = response.data?.data?.pharmacy || null;

      setToken(tokenValue);
      setUser(
        loginUser
          ? {
              ...loginUser,
              pharmacy,
            }
          : null
      );

      const nextPath = location.state?.from?.pathname || '/dashboard';
      navigate(nextPath, { replace: true });
    } catch (error) {
      const code = error.response?.data?.code || error.response?.data?.error?.code;

      if (code === 'INVALID_CREDENTIALS') {
        toast.error('Invalid email/phone or password');
      } else if (code === 'ACCOUNT_INACTIVE') {
        toast.error('Account inactive');
      } else if (code === 'EMAIL_NOT_VERIFIED') {
        const verificationToken = error.response?.data?.error?.verification_token;

        if (verificationToken) {
          toast.info('Verification required — code sent to your email');
          navigate(`/verify-email?token=${encodeURIComponent(verificationToken)}`, { replace: true });
        } else {
          toast.error('Please verify your email before logging in');
        }
      } else {
        toast.error('Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8">
      <div className="login-blob login-blob-left" aria-hidden="true" />
      <div className="login-blob login-blob-right" aria-hidden="true" />

      <Card className="relative z-10 w-full max-w-md border-primary/10 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <p className="text-2xl font-bold text-primary">PhaStock</p>
          <CardTitle className="text-2xl">PhaStock Staff Login</CardTitle>
          <CardDescription>Sign in to continue pharmacy operations</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email or phone</label>
              <Input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Enter email or phone"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <InlineSpinner className="h-3.5 w-3.5 border-white border-t-transparent" />
                  Signing in
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-1 text-sm">
            <Link
              to="/forgot-password"
              className="text-primary/80 transition-colors hover:text-primary hover:underline"
            >
              Forgot password?
            </Link>
            <Link
              to="/signup"
              className="text-primary/80 transition-colors hover:text-primary hover:underline"
            >
              Create pharmacy account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
