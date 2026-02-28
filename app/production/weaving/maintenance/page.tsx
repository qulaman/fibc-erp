'use client';

import { MaintenancePage } from '@/components/MaintenancePage';
import { Grid3x3 } from 'lucide-react';

export default function WeavingMaintenancePage() {
  return (
    <MaintenancePage
      equipmentType="weaving"
      title="Обслуживание оборудования"
      icon={Grid3x3}
    />
  );
}
