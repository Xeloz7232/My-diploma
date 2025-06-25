import React, { useState } from 'react';
import { Layout, Button, Typography, Menu, Modal, message } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import logoUrl from '../../sputnik.png'
import { useDispatch } from 'react-redux';
import { logout } from '../../features/userSlice';
import { BarChartOutlined, BookOutlined, CompassOutlined, SnippetsOutlined } from '@ant-design/icons';
import { useName, useRole, useRoleName } from '../../app/hooks';
import { CreateTask } from './header-create-task';
import '../../index.css'
import { TaskMap } from './map';
import { api } from '../../app/services/api';

const { Header } = Layout;
const { Text } = Typography;

export const MainHeader: React.FC = () => {
  const userName = useName()
  const userRoleId = useRole();
  const userRoleName = useRoleName();

  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const dispatch = useDispatch()

  const handleLogout = () => {
    dispatch(logout())
    localStorage.removeItem('token');
    dispatch(api.util.resetApiState());
    navigate('/login');
  }

  const handleCreated = () => {
    setIsModalVisible(false);
    setIsFormDirty(false);
    message.success('Заявка успешно создана');
  };

  const showCreateModal = () => setIsModalVisible(true);

  const showMapModal = () => setIsMapModalVisible(true);
  const handleMapCancel = () => setIsMapModalVisible(false);

  const handleCancel = () => {
    if (isFormDirty) {
      const confirmClose = window.confirm('Есть несохранённые данные. Вы уверены, что хотите закрыть форму?');
      if (!confirmClose) {
        return;
      }
    }
    setIsModalVisible(false);
    setIsFormDirty(false);
  };


  return (
    <>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logoUrl} alt="Logo" style={{ height: 80, margin: "0px 64px 0px 32px" }} />
        </div>


        <Menu mode="horizontal" selectedKeys={[location.pathname]} style={{ flex: 'auto', minWidth: 0, alignItems: 'center' }}>
          {userRoleId === 1 && (
            <Menu.Item>
              <Button
                type="primary"
                size="large"
                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                onClick={showCreateModal}
                className="create-task-btn"
              >
                Создать заявку
              </Button>
            </Menu.Item>
          )}
          {userRoleId === 1 && (
            <Menu.Item>
              <Button
                type="primary"
                size="large"
                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', marginTop: '12px' }}
                onClick={showMapModal}
              >
                <CompassOutlined />
              </Button>
            </Menu.Item>
          )}
          <Menu.Item key="/" icon={<SnippetsOutlined />}>
            <a href="/" onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}>
              Заявки
            </a>
          </Menu.Item>
          <Menu.Item key="/history" icon={<BookOutlined />}>
            <a href="/history" onClick={(e) => {
              e.preventDefault();
              navigate('/history');
            }}>
              История
            </a>
          </Menu.Item>
          <Menu.Item key="/statistics" icon={<BarChartOutlined />}>
            <a href="/statistics" onClick={(e) => {
              e.preventDefault();
              navigate('/statistics');
            }}>
              Статистика
            </a>
          </Menu.Item>
        </Menu>

        <div style={{ display: 'flex', flex: '0 0 auto', whiteSpace: 'nowrap', alignItems: 'center', gap: 16 }}>
          {userName ? <Text>
            {userName} | <Text style={{ color: userRoleId === 1 ? 'orange' : 'blue' }}>
              {userRoleName}
            </Text>
          </Text> : <Text type="danger">
            Не удалось загрузить
          </Text>}
          <Button onClick={handleLogout} type="primary">
            Выход
          </Button>
        </div>
      </Header>

      <Modal
        title="Создать заявку"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
        width={800}
        maskClosable={false}
        centered
        styles={{
          body: {
            maxHeight: '88vh',
            overflowY: 'auto',
            padding: '10px',
          }
        }}
      >
        <CreateTask
          setIsFormDirty={setIsFormDirty}
          onCreated={handleCreated}
        />
      </Modal>

      <Modal
        title="Карта"
        open={isMapModalVisible}
        onCancel={handleMapCancel}
        footer={null}
        width={1200}
        centered
        maskClosable={false}
        key={location.pathname} 
        styles={{
          body: {
            overflowY: 'auto',
            padding: '5px',
          }
        }}
      >
        <TaskMap />
      </Modal>
    </>
  );
};