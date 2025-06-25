import React from 'react';
import { Card } from 'antd';
import type { MiniTaskClosed } from '../../app/types';
import { truncateString } from '../../utils/truncateString';
import dayjs from 'dayjs';

interface Props {
  task: MiniTaskClosed;
  onClick: (task: MiniTaskClosed) => void;
  isCollapsed: boolean;
  isSelected: boolean;
}

export const TaskCard: React.FC<Props> = ({
  task,
  onClick,
  isCollapsed,
  isSelected,
}) => {
  // 1. Вычисляем "статус" или "дату закрытия"
  const statusOrDate = task.closedAt
    ? dayjs(task.closedAt).format('DD.MM.YYYY')
    : '—'

  // 2. Собираем значения для всех колонок
  const rawValues: (string | null)[] = [
    task.task_number,
    task.device_name,
    task.device_type,
    task.address,
    statusOrDate,
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

  return (
    <Card
      hoverable
      style={{
        marginBottom: 4,
        border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        boxShadow: isSelected
          ? '0 4px 12px rgba(24, 144, 255, 0.2)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        background: '#fff',
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
      </div>
    </Card>
  );
};
