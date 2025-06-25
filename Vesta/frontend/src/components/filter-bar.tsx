import React, { useCallback, useRef } from 'react';
import { Tag } from 'antd';
import { truncateString } from '../utils/truncateString';
import dayjs from 'dayjs';
import '../index.css'

interface FiltersBarProps {
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

  deviceTypeOptions: { value: number; label: string }[];
  addressOptions: { value: number; label: string }[];
  statusOptions?: { value: number; label: string }[];

  isTakeaway?: boolean;

  isHistory: boolean;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
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
  setStatusFilter = () => {},

  deviceTypeOptions,
  addressOptions,
  statusOptions = [],

  isTakeaway,

  isHistory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      // Смещаем горизонтальную позицию прокрутки
      scrollRef.current.scrollLeft += e.deltaY;
      // Отменяем вертикальную прокрутку страницы
      e.preventDefault();
    }
  }, []);
  
  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 8,
        padding: '8px 0',
        borderRadius: 6,
        maxWidth: '100%',
        msOverflowStyle: 'none',
      }}
      className="hide-scrollbar"
    >
      {taskNum && (() => {
        const truncated = truncateString(taskNum, 10, 8);
        if (!truncated) return null;
        const { short, full } = truncated;
        return (
          <Tag closable onClose={() => setTaskNum('')} title={short !== full ? full : undefined}>
            № Заявки: {short}
          </Tag>
        );
      })()}
      {deviceName && (() => {
        const truncated = truncateString(deviceName, 10, 8);
        if (!truncated) return null;
        const { short, full } = truncated;
        return (
          <Tag closable onClose={() => setDeviceName('')} title={short !== full ? full : undefined}>
            КЕ: {short}
          </Tag>
        );
      })()}
      {deviceTypeFilter != null && (
        <Tag closable onClose={() => setDeviceTypeFilter(null)}>
          Тип: {deviceTypeOptions.find(o => o.value === deviceTypeFilter)?.label}
        </Tag>
      )}
      {addressFilter != null && (
        (() => {
          const label = addressOptions.find(o => o.value === addressFilter)?.label || '';
          const truncated = truncateString(label, 20, 18);
          if (!truncated) return null;
          const { short, full } = truncated;
          return (
            <Tag closable onClose={() => setAddressFilter(null)} title={short !== full ? full : undefined}>
              Адрес: {short}
            </Tag>
          );
        })()
      )}
      {(statusFilter != null) && !isTakeaway && !isHistory && (
        <Tag closable onClose={() => setStatusFilter(null)}>
          Статус: {statusOptions.find(o => o.value === statusFilter)?.label}
        </Tag>
      )}
      {(closedAtDown != null) && isHistory && (
        <Tag closable onClose={() => setClosedAtDown(null)}>
          Дата от: {dayjs(closedAtDown).format('DD.MM.YYYY')}
        </Tag>
      )}
      {(closedAtUp != null) && isHistory && (
        <Tag closable onClose={() => setClosedAtUp(null)}>
          Дата до: {dayjs(closedAtUp).format('DD.MM.YYYY')}
        </Tag>
      )}
    </div>
  );
};
