'use client';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { ResponsibilityList } from '@/features/work/components/responsibility-list';
import { useState } from 'react';

export default function WorkPageClient() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <PageContainer
      pageTitle='Work & Responsibility'
      pageDescription='Create responsibilities and assign teachers to them.'
      pageHeaderAction={
        <Button onClick={() => setSheetOpen(true)}>
          <Icons.add className='mr-2 h-4 w-4' />
          Add Responsibility
        </Button>
      }
    >
      <Tabs defaultValue='all' className='space-y-4'>
        {/* ── Tab bar + search ─────────────────────────────────────── */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <TabsList variant='line'>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='active'>Active</TabsTrigger>
            <TabsTrigger value='inactive'>Inactive</TabsTrigger>
          </TabsList>

          <div className='relative w-full sm:w-64'>
            <Icons.search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              placeholder='Search responsibilities…'
              className='pl-9'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── All ─────────────────────────────────────────────────── */}
        <TabsContent value='all'>
          <ResponsibilityList
            search={search}
            status='all'
            sheetOpen={sheetOpen}
            onSheetOpenChange={setSheetOpen}
          />
        </TabsContent>

        {/* ── Active ──────────────────────────────────────────────── */}
        <TabsContent value='active'>
          <ResponsibilityList
            search={search}
            status='active'
            sheetOpen={sheetOpen}
            onSheetOpenChange={setSheetOpen}
          />
        </TabsContent>

        {/* ── Inactive ────────────────────────────────────────────── */}
        <TabsContent value='inactive'>
          <ResponsibilityList
            search={search}
            status='inactive'
            sheetOpen={sheetOpen}
            onSheetOpenChange={setSheetOpen}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
