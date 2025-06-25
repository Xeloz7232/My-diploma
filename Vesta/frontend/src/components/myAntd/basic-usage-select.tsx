import React, { useState, useMemo } from 'react';
import { Select, Space } from 'antd';
import { truncateString } from '../../utils/truncateString';

interface BasicUsageSelectProps {
  placeholder?: string;
  options: { value: number; label: string }[];
  value?: number;
  onChange?: (value?: number) => void;
}

export const BasicUsageSelect: React.FC<BasicUsageSelectProps> = ({
  placeholder,
  options,
  value,
  onChange,
}) => {
  const [search, setSearch] = useState('');

  // Фильтрация по тексту
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, options]);

  // Динамическая ширина выпадающего списка
  const dropdownWidth = useMemo(() => {
    const longestLabel = options.reduce((longest, current) =>
      current.label.length > longest.length ? current.label : longest,
      '',);
    return Math.min(Math.max(longestLabel.length * 8, 240), 600);
  }, [options]);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Select<number>
        showSearch
        allowClear
        placeholder={placeholder}
        options={filteredOptions}
        value={value}
        onSearch={text => setSearch(text)}
        onChange={onChange}
        filterOption={false}
        style={{ width: '100%' }}
        dropdownStyle={{ width: dropdownWidth }}
        labelRender={(option) => {
          const selectedLabel = typeof option?.label === 'string' ? option.label : '';
          const full = truncateString(selectedLabel, 30, 28)?.full ?? '';
          return full;
        }}
      />
    </Space>
  );
};