import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import FullScreenLoader from '@/components/FullScreenLoader';
import InlineSpinner from '@/components/InlineSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: authToken, isAuthLoading } = useAuth();

  const tokenFromQuery = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [verificationToken, setVerificationToken] = useState(tokenFromQuery);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    setVerificationToken(tokenFromQuery);
  }, [tokenFromQuery]);

  useEffect(() => {
    if (!verificationToken) {
      setIsLoadingInfo(false);
      return;
    }

    let isMounted = true;

    const loadVerificationInfo = async () => {
      setIsLoadingInfo(true);
      setIsExpired(false);

      try {
        const response = await api.get('/auth/verification', {
          params: { token: verificationToken },
        });

        const responseEmail = response.data?.data?.email || '';

        if (isMounted) {
          setEmail(responseEmail);
          setIsExpired(false);
        }
      } catch (error) {
        const errCode = error.response?.data?.code;

        if (isMounted) {
          if (errCode === 'VERIFICATION_EXPIRED') {
            setIsExpired(true);
            toast.error('Verification link expired');
          } else if (errCode === 'VERIFICATION_NOT_FOUND') {
            toast.error('Verification link is invalid');
          } else {
            toast.error('Failed to load verification details');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingInfo(false);
        }
      }
    };

    loadVerificationInfo();

    return () => {
      isMounted = false;
    };
  }, [verificationToken]);

  if (isAuthLoading && authToken) {
    return <FullScreenLoader label="Restoring session" />;
  }

  const startCooldown = () => {
    setCooldownLeft(RESEND_COOLDOWN_SECONDS);

    const timer = window.setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const onResendCode = async () => {
    if (!verificationToken) {
      toast.error('Verification token is missing');
      return;
    }

    setIsResending(true);

    try {
      const payload = { token: verificationToken };
      const normalizedEmail = email.trim();

      if (normalizedEmail) {
        payload.email = normalizedEmail;
      }

      const response = await api.post('/auth/verification/resend', payload);

      const data = response.data?.data || {};
      const nextToken = data.token;

      if (nextToken && nextToken !== verificationToken) {
        setVerificationToken(nextToken);
        navigate(`/verify-email?token=${encodeURIComponent(nextToken)}`, { replace: true });
      }

      if (data.email) {
        setEmail(data.email);
      }

      setIsExpired(false);
      toast.success('Code sent');
      startCooldown();
    } catch (error) {
      const errCode = error.response?.data?.code;

      if (errCode === 'VERIFICATION_NOT_FOUND') {
        toast.error('Verification link is invalid');
      } else if (errCode === 'EMAIL_TAKEN') {
        toast.error('Email is already in use');
      } else if (errCode === 'VALIDATION_ERROR') {
        toast.error('Please enter a valid email');
      } else {
        toast.error('Failed to resend verification code');
      }
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!verificationToken) {
      toast.error('Verification token is missing');
      return;
    }

    if (!code.trim()) {
      toast.error('Code is required');
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Code must be 6 digits');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/verification/confirm', {
        token: verificationToken,
        code: code.trim(),
      });

      toast.success('Email verified successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      const errCode = error.response?.data?.code;

      if (errCode === 'INVALID_CODE') {
        toast.error('Invalid verification code');
      } else if (errCode === 'VERIFICATION_EXPIRED') {
        setIsExpired(true);
        toast.error('Verification link expired. Please resend code.');
      } else if (errCode === 'VERIFICATION_NOT_FOUND') {
        toast.error('Verification link is invalid');
      } else if (errCode === 'VALIDATION_ERROR') {
        toast.error('Please check your input values');
      } else {
        toast.error('Failed to verify email');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!verificationToken) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8">
        <div className="login-blob login-blob-left" aria-hidden="true" />
        <div className="login-blob login-blob-right" aria-hidden="true" />

        <Card className="relative z-10 w-full max-w-md border-primary/10 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Invalid verification link</CardTitle>
            <CardDescription>Verification token is missing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-center text-sm">
            <Link className="text-primary hover:underline" to="/signup">
              Go to signup
            </Link>
            <div>
              <Link className="text-primary hover:underline" to="/login">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingInfo) {
    return <FullScreenLoader label="Loading verification" />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8">
      <div className="login-blob login-blob-left" aria-hidden="true" />
      <div className="login-blob login-blob-right" aria-hidden="true" />

      <Card className="relative z-10 w-full max-w-md border-primary/10 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <p className="text-2xl font-bold text-primary">PhaStock</p>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>Enter the 6 digit code sent to your email address</CardDescription>
        </CardHeader>

        <CardContent>
          {isExpired ? (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Your link expired. Click Resend code to get a fresh code.
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Verification code</label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="6 digit code"
                inputMode="numeric"
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <InlineSpinner className="h-3.5 w-3.5 border-white border-t-transparent" />
                  Verifying
                </span>
              ) : (
                'Verify email'
              )}
            </Button>
          </form>

          <div className="mt-3 text-center text-sm">
            <button
              type="button"
              onClick={onResendCode}
              disabled={isResending || cooldownLeft > 0}
              className="text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              {isResending
                ? 'Sending code...'
                : cooldownLeft > 0
                  ? `Resend code in ${cooldownLeft}s`
                  : 'Resend code'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Back to{' '}
            <Link className="text-primary hover:underline" to="/login">
              login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
