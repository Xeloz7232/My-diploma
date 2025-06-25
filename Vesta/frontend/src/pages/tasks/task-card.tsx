import React from 'react';
import { Card, Checkbox } from 'antd';
import type { MiniTask } from '../../app/types';
import { truncateString } from '../../utils/truncateString';

interface Props {
  task: MiniTask;
  onClick: (task: MiniTask) => void;
  isCollapsed: boolean;
  isSelected: boolean;
  onCheckboxChange: (id: string, checked: boolean) => void;
  isChecked: boolean;
  isTakeaway: boolean;
}

export const TaskCard: React.FC<Props> = ({
  task,
  onClick,
  isCollapsed,
  isSelected,
  onCheckboxChange,
  isChecked,
  isTakeaway,
}) => {
  // 2. Собираем значения для всех колонок
  const rawValues: (string | null)[] = [
    task.task_number,
    task.device_name,
    task.device_type,
    task.address,
    task.statuses.name,
  ];

  // 3. Преобразуем в {short, full}
  const displayValues = rawValues.map((val, idx) => {
    if (val == null) return null;
    // Для последнего столбца (статус или дата) не режем
    if (idx === 4) {
      return { short: val, full: val };
    }
    // Для остальных — truncate
    const [shortLen, fullLen] = isCollapsed ? [8, 10] : [28, 30];
    return truncateString(val, fullLen, shortLen);
  });

  let background = 'white';
  if (isChecked === true) background = 'rgba(161, 210, 255, 1)'
  if (task.statuses.id === 4) background = 'rgba(254, 249, 222, 1)';
  else if (task.statuses.id === 5) background = 'rgba(230, 252, 229, 1)';

  return (
    <Card
      hoverable
      style={{
        marginBottom: 4,
        border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        boxShadow: isSelected
          ? '0 4px 12px rgba(24, 144, 255, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        background,
      }}
      styles={{
        body: {
          padding: 8,
        },
      }}
      onClick={() => onClick(task)}
    >
      <div style={{ display: 'flex' }}>
        {displayValues
          .map(item => item ?? { short: 'Ошибка...', full: 'Ошибка данных' })
          .map(({ full, short }, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: short === 'Ошибка...' ? 'red' : undefined,
              }}
              title={short !== full ? full : undefined}
            >
              {isCollapsed ? short : full}
            </div>
          ))}
        {isTakeaway && <Checkbox
          style={{ transform: 'scale(1.25)', marginLeft: 10 }}
          checked={isChecked}
          onClick={e => e.stopPropagation()}
          onChange={e => onCheckboxChange(task.id, e.target.checked)}
        />}
      </div>
    </Card>
  );
};
