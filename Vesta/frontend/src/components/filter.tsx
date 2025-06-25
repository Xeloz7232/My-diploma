import React, { useState } from 'react';
import { Dropdown, Button, Input, Space, DatePicker } from 'antd';
import { createStyles } from 'antd-style';
import { BasicUsageSelect } from './myAntd/basic-usage-select';
import { FilterOutlined } from '@ant-design/icons';
import MySpin from './myAntd/spin';
import dayjs, { Dayjs } from 'dayjs';

interface FilterProps {
  taskNum: string;
  setTaskNum: (val: string) => void;

  deviceName: string;
  setDeviceName: (val: string) => void;

  deviceTypeFilter: number | null;
  setDeviceTypeFilter: (val: number | null) => void;

  addressFilter: number | null;
  setAddressFilter: (val: number | null) => void;

  statusFilter?: number | null;
  setStatusFilter?: (val: number | null) => void;

  closedAtDown?: Date | null;
  setClosedAtDown?: (val: Date | null) => void;

  closedAtUp?: Date | null;
  setClosedAtUp?: (val: Date | null) => void;

  addressOptions: { value: number; label: string }[];
  deviceTypeOptions: { value: number; label: string }[];
  statusOptions?: { value: number; label: string }[];

  isTakeaway?: boolean;

  loading: boolean;

  isHistory: boolean;
}

// Стили для выпадающего меню
const useStyle = createStyles(() => ({
  overlay: {
    padding: 16,
    backgroundColor: 'rgba(119,171,211,255)',
    borderRadius: 4,
    minWidth: 240,
  },
}));

export const FilterDropdown: React.FC<FilterProps> = ({
  taskNum,
  setTaskNum,

  deviceName,
  setDeviceName,

  deviceTypeFilter,
  setDeviceTypeFilter,

  addressFilter,
  setAddressFilter,

  closedAtDown = null,
  setClosedAtDown = () => { },

  closedAtUp = null,
  setClosedAtUp = () => { },

  statusFilter = null,
  setStatusFilter = () => { },

  addressOptions,
  deviceTypeOptions,
  statusOptions = [],

  isTakeaway,

  loading,

  isHistory,
}) => {
  const { styles } = useStyle();
  const [visible, setVisible] = useState(false);

  // Обработчик для “От”
  const onFromChange = (date: Dayjs | null) => {
    const newFrom = date ? date.toDate() : null;
    // если обе даты заданы и новая “From” позже текущей “To” — меняем местами
    if (newFrom && closedAtUp && newFrom > closedAtUp) {
      setClosedAtDown(closedAtUp);
      setClosedAtUp(newFrom);
    } else {
      setClosedAtDown(newFrom);
    }
  };

  // Обработчик для “До”
  const onToChange = (date: Dayjs | null) => {
    const newTo = date ? date.toDate() : null;
    // если обе даты заданы и новая “To” раньше текущей “From” — меняем местами
    if (newTo && closedAtDown && newTo < closedAtDown) {
      setClosedAtDown(newTo);
      setClosedAtUp(closedAtDown);
    } else {
      setClosedAtUp(newTo);
    }
  };

  // Контент фильтров
  const overlayContent = (
    <div className={styles.overlay} onClick={e => e.stopPropagation()}>
      <Space direction="vertical" size={16} style={{ width: 255 }}>
        <Input
          placeholder="Номер заявки"
          value={taskNum}
          onChange={e => setTaskNum(e.target.value)}
        />
        <Input
          placeholder="Конфигурационная единица"
          value={deviceName}
          onChange={e => setDeviceName(e.target.value)}
        />
        {loading ? (
          <MySpin />
        ) : (
          <>
            <BasicUsageSelect
              placeholder="Тип устройства"
              options={deviceTypeOptions}
              value={deviceTypeFilter ?? undefined}
              onChange={val => setDeviceTypeFilter(val ?? null)}
            />
            <BasicUsageSelect
              placeholder="Адрес"
              options={addressOptions}
              value={addressFilter ?? undefined}
              onChange={val => setAddressFilter(val ?? null)}
            />
            {!isHistory && !isTakeaway && <BasicUsageSelect
              placeholder="Статус"
              options={statusOptions}
              value={statusFilter ?? undefined}
              onChange={val => setStatusFilter(val ?? null)}
            />}
            {isHistory && (
              <Space
                size="middle"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <DatePicker
                  placeholder="От"
                  allowClear
                  value={closedAtDown ? dayjs(closedAtDown) : undefined}
                  onChange={onFromChange}
                  style={{ flex: 1 }}
                />
                <DatePicker
                  placeholder="До"
                  allowClear
                  value={closedAtUp ? dayjs(closedAtUp) : undefined}
                  onChange={onToChange}
                  style={{ flex: 1 }}
                />
              </Space>
            )}

          </>
        )}
      </Space>
    </div>
  );

  return (
    <Dropdown
      trigger={['click']}
      open={visible}
      onOpenChange={flag => setVisible(flag)}
      dropdownRender={() => overlayContent}
    >
      <Button type="primary" icon={<FilterOutlined />}>Фильтры</Button>
    </Dropdown>
  );
};
