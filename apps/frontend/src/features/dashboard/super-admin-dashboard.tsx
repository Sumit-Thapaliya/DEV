'use client';

import { useState } from 'react';
import { ShieldPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import type { AuthUser } from '@/features/auth/api';
import { PasswordInput } from '@/features/auth/password-input';
import { AdminDashboard } from '@/features/dashboard/admin-dashboard';
import { apiPost } from '@/features/dashboard/shared';

export function SuperAdminDashboard({ user }: { user: AuthUser }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({
        title: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      await apiPost('/api/admin/admins', {
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });

      toast({ title: 'Admin account created', variant: 'success' });
      setEmail('');
      setName('');
      setPassword('');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast({ title: (error as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminDashboard key={refreshKey} user={user} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldPlus className="h-4 w-4 text-primary" /> Create admin account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@jobdev.app"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name (optional)</Label>
              <Input
                id="admin-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <PasswordInput
                id="admin-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? 'Creating…' : 'Create admin'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
