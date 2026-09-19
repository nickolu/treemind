'use client';
import dynamic from 'next/dynamic';

// The mind map lives in localStorage and uses browser-only APIs, so render it
// on the client only. This also avoids server/client hydration mismatches.
const HomePage = dynamic(
  () => import('@/components/templates/Home').then((m) => m.HomePage),
  {ssr: false},
);

export default function Home() {
  return <HomePage />;
}
