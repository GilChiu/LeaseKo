import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LeaseKo',
  description: 'Property Management SaaS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
