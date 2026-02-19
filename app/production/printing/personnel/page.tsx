import DepartmentPersonnel from '@/components/DepartmentPersonnel';

export default function PrintingPersonnelPage() {
  return (
    <DepartmentPersonnel
      department="printing"
      departmentName="Печать"
      roles={[
        { value: 'operator_printing', label: 'Оператор печати' },
      ]}
      backLink="/production/printing"
      bgColor="bg-purple-600"
    />
  );
}
