import DepartmentPersonnel from '@/components/DepartmentPersonnel';

export default function LaminationPersonnelPage() {
  return (
    <DepartmentPersonnel
      department="lamination"
      departmentName="Ламинация"
      roles={[
        { value: 'operator_lamination', label: 'Оператор Ламинации' },
      ]}
      backLink="/production/lamination"
      bgColor="bg-purple-600"
    />
  );
}
