'use client';

import { MaintenancePage } from '@/components/MaintenancePage';
import { Cable } from 'lucide-react';

export default function ExtrusionMaintenancePage() {
  return (
    <MaintenancePage
      equipmentType="extruder"
      title="Обслуживание оборудования"
      icon={Cable}
    />
  );
}
