'use client';

import { MaintenancePage } from '@/components/MaintenancePage';
import { Layers } from 'lucide-react';

export default function LaminationMaintenancePage() {
  return (
    <MaintenancePage
      equipmentType="lamination"
      title="Обслуживание оборудования"
      icon={Layers}
    />
  );
}
