import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - BizBox',
  description: 'Start your free trial with BizBox. Professional business tools in minutes.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}