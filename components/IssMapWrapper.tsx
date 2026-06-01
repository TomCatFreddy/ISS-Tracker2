'use client';

import dynamic from 'next/dynamic';

const IssMap = dynamic(() => import('@/components/IssMap'), { ssr: false });

export default function IssMapWrapper() {
  return <IssMap />;
}
