import DepartmentPersonnel from '@/components/DepartmentPersonnel';

export default function SewingPersonnelPage() {
  return (
    <DepartmentPersonnel
      department="sewing"
      departmentName="Пошив"
      roles={[
        { value: 'operator_sewing', label: 'Швея' },
      ]}
      backLink="/production/sewing/daily"
      bgColor="bg-pink-600"
    />
  );
}
