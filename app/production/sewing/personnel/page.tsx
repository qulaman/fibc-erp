import DepartmentPersonnel from '@/components/DepartmentPersonnel';

export default function SewingPersonnelPage() {
  return (
    <DepartmentPersonnel
      department="sewing"
      departmentName="Пошив и ОТК"
      roles={[
        { value: 'operator_sewing', label: 'Швея' },
        { value: 'master_sewing', label: 'Мастер пошива' },
        { value: 'shift_master', label: 'Мастер смены' },
        { value: 'qc_inspector', label: 'Контролёр ОТК' },
      ]}
      backLink="/production/sewing"
      bgColor="bg-pink-600"
    />
  );
}
