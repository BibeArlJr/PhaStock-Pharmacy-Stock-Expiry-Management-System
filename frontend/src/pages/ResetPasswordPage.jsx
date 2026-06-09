import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import InlineSpinner from '@/components/InlineSpinner';
import PasswordInput from '@/components/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidLink, setInvalidLink] = useState(!token);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setInvalidLink(true);
      toast.error('This link is invalid or has expired');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setInvalidLink(false);

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Password reset successful. Please log in.');
      navigate('/login', { replace: true });
    } catch (error) {
      setInvalidLink(true);
      toast.error('This link is invalid or has expired');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            {invalidLink
              ? 'This link is invalid or has expired.'
              : 'Enter a new password for your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!invalidLink ? (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">New password</label>
                <PasswordInput
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <InlineSpinner className="h-3.5 w-3.5 border-white border-t-transparent" />
                    Resetting
                  </span>
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Link to="/forgot-password" className="block text-center text-sm text-primary hover:underline">
                Request a new link
              </Link>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

