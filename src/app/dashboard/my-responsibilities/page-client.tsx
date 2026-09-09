'use client';

import PageContainer from '@/components/layout/page-container';
import { MyResponsibilitiesList } from '@/features/work/components/my-responsibilities-list';

export default function MyResponsibilitiesClient() {
  return (
    <PageContainer
      pageTitle='My Responsibilities'
      pageDescription='Responsibilities assigned to you by the Head of Department.'
    >
      <MyResponsibilitiesList />
    </PageContainer>
  );
}
