'use client';

import { MaintenancePage } from '@/components/MaintenancePage';
import { Wrench } from 'lucide-react';

export default function StrapsMaintenancePage() {
  return (
    <MaintenancePage
      equipmentType="loom_flat"
      title="Обслуживание оборудования"
      icon={Wrench}
    />
  );
}
