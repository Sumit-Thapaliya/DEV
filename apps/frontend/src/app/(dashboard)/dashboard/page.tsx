'use client';
import { useSession } from '@/features/auth/queries';
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(
  () =>
    import('@/features/dashboard/admin-dashboard').then(
      (module) => module.AdminDashboard,
    ),
  { loading: () => <p role="status">Opening dashboard…</p> },
);
const CandidateDashboard = dynamic(
  () =>
    import('@/features/dashboard/candidate-dashboard').then(
      (module) => module.CandidateDashboard,
    ),
  { loading: () => <p role="status">Opening dashboard…</p> },
);
const RecruiterDashboard = dynamic(
  () =>
    import('@/features/dashboard/recruiter-dashboard').then(
      (module) => module.RecruiterDashboard,
    ),
  { loading: () => <p role="status">Opening dashboard…</p> },
);
const SuperAdminDashboard = dynamic(
  () =>
    import('@/features/dashboard/super-admin-dashboard').then(
      (module) => module.SuperAdminDashboard,
    ),
  { loading: () => <p role="status">Opening dashboard…</p> },
);

export default function DashboardPage() {
  const { data: user } = useSession();

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
