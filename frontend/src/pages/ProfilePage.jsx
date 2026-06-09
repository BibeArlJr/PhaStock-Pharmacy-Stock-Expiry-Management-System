import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab');

  const displayName = user?.fullName || 'Staff';
  const email = user?.email || 'No email';
  const pharmacyName = user?.pharmacy?.name || 'Unknown Pharmacy';
  const pharmacyId = user?.pharmacy?.id;

  const subtitle = useMemo(() => {
    if (activeTab === 'pharmacy') {
      return 'Verify and update the pharmacy information associated with your account.';
    }

    return 'View your account profile and the pharmacy you are signed into.';
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Your user information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Name</span>
            <span className="text-base font-medium text-foreground">{displayName}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Email</span>
            <span className="text-base text-foreground">{email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pharmacy details</CardTitle>
          <CardDescription>Information for the pharmacy assigned to your user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Name</span>
            <span className="text-base font-medium text-foreground">{pharmacyName}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Pharmacy ID</span>
            <span className="text-base text-foreground">
              {pharmacyId ? pharmacyId : 'Not available'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
