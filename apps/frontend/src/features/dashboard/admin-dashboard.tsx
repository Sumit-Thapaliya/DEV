'use client';

import { toast } from '@/components/ui/use-toast';
import { useAccountQuery } from '@/features/auth/queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AuthUser } from '@/features/auth/api';
import {
  apiDelete,
  EmptyState,
  formatDate,
  Section,
  StatCard,
  type JobRow,
  type UserRow,
} from '@/features/dashboard/shared';

interface Stats {
  candidates: number;
  recruiters: number;
  admins: number;
  jobs: number;
}

const ROLE_BADGES: Record<string, string> = {
  candidate: 'bg-info/10 text-info',
  recruiter: 'bg-primary-light text-primary-dark',
  admin: 'bg-warning/10 text-warning',
  superadmin: 'bg-success/10 text-success',
};

export function AdminDashboard({ user }: { user: AuthUser }) {
  const client = useQueryClient();
  const statsQuery = useAccountQuery<{ stats: Stats }>('/api/admin/stats');
  const usersQuery = useAccountQuery<{ users: UserRow[] }>('/api/admin/users');
  const jobsQuery = useAccountQuery<{ jobs: JobRow[] }>('/api/jobs');
  const stats = statsQuery.data?.stats;
  const users = usersQuery.data?.users ?? [];
  const jobs = jobsQuery.data?.jobs ?? [];
  const remove = useMutation({
    mutationFn: (path: string) => apiDelete(path),
    onSuccess: () => {
      toast({ title: 'Removed', variant: 'success' });
      void client.invalidateQueries({ queryKey: ['account', user.id] });
    },
    onError: (error) => toast({ title: error.message, variant: 'destructive' }),
  });
  const busyId = remove.isPending ? remove.variables?.split('/').pop() : null;
  const handleDeleteUser = (target: UserRow) =>
    remove.mutate(`/api/admin/users/${target.id}`);
  const handleDeleteJob = (job: JobRow) => remove.mutate(`/api/jobs/${job.id}`);

  const deletable = (row: UserRow) =>
    row.id !== user.id && row.role !== 'admin' && row.role !== 'superadmin';

  return (
    <div className="space-y-8">
      {(statsQuery.error || usersQuery.error || jobsQuery.error) && (
        <p role="alert" className="text-destructive">
          {(statsQuery.error ?? usersQuery.error ?? jobsQuery.error)?.message}{' '}
          <button
            onClick={() =>
              client.invalidateQueries({ queryKey: ['account', user.id] })
            }
          >
            Retry
          </button>
        </p>
      )}
      <header>
        <h1 className="page-title">Admin console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live overview of users and jobs on the platform.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={UserRound}
          label="Candidates"
          value={stats?.candidates ?? '…'}
        />
        <StatCard
          icon={Briefcase}
          label="Recruiters"
          value={stats?.recruiters ?? '…'}
        />
        <StatCard
          icon={ShieldCheck}
          label="Admins"
          value={stats?.admins ?? '…'}
        />
        <StatCard
          icon={Building2}
          label="Open jobs"
          value={stats?.jobs ?? '…'}
        />
      </div>

      <Section title={`Users (${users.length})`}>
        {users.length === 0 ? (
          <EmptyState title="No users yet" />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">User</th>
                      <th className="px-5 py-3 font-semibold">Role</th>
                      <th className="px-5 py-3 font-semibold">Joined</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">
                            {row.name ?? row.identifier}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.identifier}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_BADGES[row.role] ?? 'bg-muted text-muted-foreground'}`}
                          >
                            {row.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {deletable(row) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={busyId === row.id}
                              onClick={() => handleDeleteUser(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </Section>

      <Section title={`Jobs (${jobs.length})`}>
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            hint="Jobs appear here when your Python microservice posts them to /api/jobs/ingest."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">Role</th>
                      <th className="px-5 py-3 font-semibold">Company</th>
                      <th className="px-5 py-3 font-semibold">Posted</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-5 py-3 font-medium text-foreground">
                          {job.title}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {job.company}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {formatDate(job.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={busyId === job.id}
                            onClick={() => handleDeleteJob(job)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </Section>
    </div>
  );
}
