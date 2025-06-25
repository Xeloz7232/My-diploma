import React, { useState } from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logoUrl from '../sputnik.png';
import { useLazyGetUserProfileQuery, useLoginMutation } from '../app/services/userApi';
import { selectIsAuthenticated } from '../features/userSlice';
import { ErrorMessage } from '../components/error-message';

const { Title } = Typography;

export const Login: React.FC = () => {
  const [login, { isLoading }] = useLoginMutation();
  const [triggerUser] = useLazyGetUserProfileQuery();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onFinish = async (values: { login: string; password: string }) => {
    try {
      setError('');
      await login(values).unwrap();
      await triggerUser();
      navigate('/');
    } catch (e) {
      console.error('login error:', e);
      setError('Неверный логин или пароль');
    }
  };

  // Базовая и дополнительная высота контейнера
  const BASE_HEIGHT = 450;
  const EXTRA_HEIGHT = 30; // достаточно, чтобы влез ErrorMessage (≈60px)
  const containerMaxHeight = error ? BASE_HEIGHT + EXTRA_HEIGHT : BASE_HEIGHT;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'rgba(119,171,211,1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 400,
          maxHeight: containerMaxHeight,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ marginBottom: 5 }}>
          <img
            src={logoUrl}
            alt="Logo"
            style={{ display: 'block', width: 130, height: 'auto' }}
          />
        </div>

        <Title level={3} style={{ textAlign: 'center', marginBottom: 12 }}>
          Вход в аккаунт
        </Title>

        <Form
          name="login"
          layout="vertical"
          onFinish={onFinish}
          style={{ width: '100%' }}
        >
          <Form.Item
            label="Логин"
            name="login"
          >
            <Input placeholder="Логин" id="username" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
          >
            <Input.Password
              placeholder="••••••••"
              id="current-password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ width: '100%' }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isLoading}
              style={{ marginTop: 10 }}
            >
              Войти
            </Button>

            {/* Здесь анимированное появление ошибки */}
            <ErrorMessage error={error} />
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};
