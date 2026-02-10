import DepartmentPersonnel from '@/components/DepartmentPersonnel';

export default function StrapsPersonnelPage() {
  return (
    <DepartmentPersonnel
      department="straps"
      departmentName="Стропы"
      roles={[
        { value: 'operator_straps', label: 'Оператор Строп' },
      ]}
      backLink="/production/straps"
      bgColor="bg-orange-600"
    />
  );
}
