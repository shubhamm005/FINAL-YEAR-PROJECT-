import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BillingPage() {
  return (
    <PageContainer pageTitle='Billing & Plans' pageDescription='Manage your subscription and usage'>
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>
            Connect your billing provider (e.g. Stripe) to manage plans here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm'>
            Billing integration is not configured. Add your Stripe or LemonSqueezy keys to get
            started.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
