import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import FullScreenLoader from '@/components/FullScreenLoader';
import InlineSpinner from '@/components/InlineSpinner';
import PasswordInput from '@/components/PasswordInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const { token, isAuthLoading } = useAuth();

  const [form, setForm] = useState({
    pharmacyName: '',
    ownerFullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthLoading && token) {
    return <FullScreenLoader label="Restoring session" />;
  }

  if (token && !isAuthLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const onChange = (key) => (event) => {
    setForm((prev) => ({
      ...prev,
      [key]: event.target.value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.pharmacyName.trim() ||
      !form.ownerFullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      toast.error('All fields are required');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/signup-pharmacy', {
        pharmacyName: form.pharmacyName.trim(),
        ownerFullName: form.ownerFullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      const verificationToken = response.data?.data?.verification_token;

      if (!verificationToken) {
        toast.error('Verification token missing from response');
        return;
      }

      toast.success('Verification code sent to your email');
      navigate(`/verify-email?token=${encodeURIComponent(verificationToken)}`, { replace: true });
    } catch (error) {
      const code = error.response?.data?.code;

      if (code === 'EMAIL_TAKEN') {
        toast.error('Email is already taken');
      } else if (code === 'PHONE_TAKEN') {
        toast.error('Phone is already taken');
      } else if (code === 'VALIDATION_ERROR') {
        toast.error('Please check your input values');
      } else {
        toast.error('Failed to create account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8">
      <div className="login-blob login-blob-left" aria-hidden="true" />
      <div className="login-blob login-blob-right" aria-hidden="true" />

      <Card className="relative z-10 w-full max-w-2xl border-primary/10 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <p className="text-2xl font-bold text-primary">PhaStock</p>
          <CardTitle>Create pharmacy account</CardTitle>
          <CardDescription>Create your pharmacy and first owner login</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Pharmacy name</label>
                <Input
                  value={form.pharmacyName}
                  onChange={onChange('pharmacyName')}
                  placeholder="Enter pharmacy name"
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Owner full name</label>
                <Input
                  value={form.ownerFullName}
                  onChange={onChange('ownerFullName')}
                  placeholder="Enter owner full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={onChange('email')}
                  placeholder="Enter email"
                  required
                />
                <p className="text-xs text-muted-foreground">Used for verification and recovery</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={form.phone}
                  onChange={onChange('phone')}
                  placeholder="Enter phone number"
                  required
                />
                <p className="text-xs text-muted-foreground">Used for login and alerts</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <PasswordInput
                  value={form.password}
                  onChange={onChange('password')}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm password</label>
                <PasswordInput
                  value={form.confirmPassword}
                  onChange={onChange('confirmPassword')}
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <InlineSpinner className="h-3.5 w-3.5 border-white border-t-transparent" />
                  Creating account
                </span>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="text-primary hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
