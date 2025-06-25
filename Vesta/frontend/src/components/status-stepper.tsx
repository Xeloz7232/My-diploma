import React from 'react';
import { Button, Popconfirm } from 'antd';

type Status = { id: number; name: string };
type RoleId = number;

interface StatusStepperProps {
  statuses: Status[];             // весь список статусов в нужном порядке
  currentStatusId: number;        // текущий статус задачи
  onChange: (nextStatusId: number) => void;
  userRoleId: RoleId;             // передаём роль текущего пользователя
  rolePermissions?: {             // по умолчанию — все могут
    [statusId: number]: RoleId; // для каждого текущего статуса — массив ролей, которым видно кнопку
  };
}

export const StatusStepper: React.FC<StatusStepperProps> = ({
  statuses,
  currentStatusId,
  onChange,
  userRoleId,
  rolePermissions = {},
}) => {
  // В какую роль разрешено менять статус из currentStatusId:
  const allowedRoles = rolePermissions[currentStatusId];
  if (allowedRoles !== undefined && allowedRoles !== userRoleId) {
    // у этой роли нет доступа — не показываем кнопку
    return null;
  } 

  // карта текста кнопки для каждого текущего статуса
  const actionLabels: Record<number, string> = {
    1: 'Техника отправлена',
    2: 'Приступить к ремонту',
    3: 'Ремонт завершён',
    4: 'Техника принята',
    5: 'Закрыть заявку',
  };

  const idx = statuses.findIndex(s => s.id === currentStatusId);
  const next = statuses[idx + 1];
  const label = actionLabels[currentStatusId];

  // Если статус последний или не определён в карте — ничего не рендерим
  if (!next || !label) return null;

  return (
    <Popconfirm
      title={`Поменять статус на “${next.name}”?`}
      onConfirm={() => onChange(next.id)}
      okText="Да"
      cancelText="Отмена"
    >
      <Button type="primary">
        {label}
      </Button>
    </Popconfirm>
  );
};
