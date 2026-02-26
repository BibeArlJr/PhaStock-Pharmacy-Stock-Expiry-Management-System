import { Link } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>Password reset flow will be added in a later phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
