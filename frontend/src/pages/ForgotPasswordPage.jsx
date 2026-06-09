import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InlineSpinner from '@/components/InlineSpinner';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (error) {
      // Keep generic success UX; backend also responds generically
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            {submitted
              ? 'Check your email for a reset link.'
              : 'Enter your email and we’ll send you a reset link.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  type="email"
                  required
                />
              </div>

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <InlineSpinner className="h-3.5 w-3.5 border-white border-t-transparent" />
                    Sending link
                  </span>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
          ) : null}

          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
