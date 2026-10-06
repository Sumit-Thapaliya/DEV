'use client';

import { AdminDashboard } from '@/features/dashboard/admin-dashboard';
import { CandidateDashboard } from '@/features/dashboard/candidate-dashboard';
import { RecruiterDashboard } from '@/features/dashboard/recruiter-dashboard';
import { SuperAdminDashboard } from '@/features/dashboard/super-admin-dashboard';
import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'recruiter':
      return <RecruiterDashboard />;
    case 'admin':
      return <AdminDashboard user={user} />;
    case 'superadmin':
      return <SuperAdminDashboard user={user} />;
    default:
      return <CandidateDashboard />;
  }
}
