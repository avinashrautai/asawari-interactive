import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASAWARI — VS Group',
  description: 'Interactive architectural experience for ASAWARI.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
