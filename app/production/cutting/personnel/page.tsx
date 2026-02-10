import DepartmentPersonnel from '@/components/DepartmentPersonnel';

export default function CuttingPersonnelPage() {
  return (
    <DepartmentPersonnel
      department="cutting"
      departmentName="Крой"
      roles={[
        { value: 'operator_cutting', label: 'Оператор Резки' },
      ]}
      backLink="/production/cutting"
      bgColor="bg-yellow-600"
    />
  );
}
