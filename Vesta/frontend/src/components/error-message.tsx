// src/components/ErrorMessage.tsx
import React from 'react';
import { Typography } from 'antd';

export const ErrorMessage: React.FC<{ error?: string }> = ({ error }) => (
  <div
    style={{
      overflow: 'hidden',
      maxHeight: error ? 60 : 0,
      transition: 'max-height 0.3s ease',
      width: '100%',
    }}
  >
    {error && (
      <Typography.Text
        type="danger"
        style={{
          display: 'block',
          marginTop: 16,
          marginBottom: 20,
          fontSize: '14px',
          textAlign: 'center',
          width: '100%',
        }}
      >
        {error}
      </Typography.Text>
    )}
  </div>
);
