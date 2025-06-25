import '../../index.css'
import React, { useEffect, useState } from 'react';
import { Button, Layout, Pagination } from 'antd';
import { MainHeader } from '../../components/header/header';
import { useGetDataQuery } from '../../app/services/dataApi';
import { useGetClosedTasksQuery, useGetTaskByIdQuery } from '../../app/services/taskApi';
import { FilterDropdown } from '../../components/filter';
import { FiltersBar } from '../../components/filter-bar';
import MySpin from '../../components/myAntd/spin';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectIsAuthenticated } from '../../features/userSlice';
import { useRole } from '../../app/hooks';
import { TaskCard } from './task-card-history';
import { TaskDetailView } from './task-history-detail-panel';

const { Header, Content } = Layout;

export const ClosedTasks: React.FC = () => {
  const userRoleId = useRole();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const { data, isLoading } = useGetDataQuery();

  const [taskNum, setTaskNum] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<number | null>(null);
  const [addressFilter, setAddressFilter] = useState<number | null>(null);
  const [closedAtDown, setClosedAtDown] = useState<Date | null>(null);
  const [closedAtUp, setClosedAtUp] = useState<Date | null>(null);
  const [page, setPage] = useState<number>(1);
  const fixedPageSize = 50;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // список карт задач с фильтрами
  const { data: tasks } = useGetClosedTasksQuery({
    task_number: taskNum || undefined,
    device_name: deviceName || undefined,
    device_type_id: deviceTypeFilter ?? undefined,
    address_id: addressFilter ?? undefined,
    closedAtDown: closedAtDown ?? undefined,
    closedAtUp: closedAtUp ?? undefined,
    page,
    pageSize: fixedPageSize,
  });

  const items = tasks?.items ?? [];

  const total = tasks?.total ?? 0;
  const currentPage = page!;

  useEffect(() => {
    setPage(1);
  }, [taskNum, deviceName, deviceTypeFilter, addressFilter]);

  const handleClear = async () => {
    setTaskNum('')
    setDeviceName('')
    setDeviceTypeFilter(null)
    setAddressFilter(null)
    setClosedAtDown(null)
    setClosedAtUp(null)
  }

  // загрузка detail выбранной задачи
  const {
    data: selectedTaskDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useGetTaskByIdQuery(selectedTaskId!, {
    skip: !selectedTaskId,
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return (
      <Layout style={{
        height: '100vh',
        background: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
      }}
      >
        <MySpin />
      </Layout>
    );
  }

  // опции из API
  const deviceTypeOptions =
    data?.device_types.map(dt => ({ value: dt.id, label: dt.name })) ?? [];
  const addressOptions =
    data?.addresses.map(adr => ({ value: adr.id, label: adr.name })) ?? [];

  let closeText = 'Дата закрытия';
  if (userRoleId != 1) closeText = 'Дата ремонта'

  return (
    <Layout
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <MainHeader />

      <Layout style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Layout
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'rgba(119,171,211,255)',
          }}
        >
          <Header
            style={{
              borderRadius: 5,
              height: 50,
              padding: 16,
              background: '#fff',
              margin: '16px 16px 0px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <FilterDropdown
              taskNum={taskNum}
              setTaskNum={setTaskNum}

              deviceName={deviceName}
              setDeviceName={setDeviceName}

              deviceTypeFilter={deviceTypeFilter}
              setDeviceTypeFilter={setDeviceTypeFilter}

              addressFilter={addressFilter}
              setAddressFilter={setAddressFilter}

              deviceTypeOptions={deviceTypeOptions}
              addressOptions={addressOptions}

              closedAtDown={closedAtDown}
              setClosedAtDown={setClosedAtDown}

              closedAtUp={closedAtUp}
              setClosedAtUp={setClosedAtUp}

              loading={isLoading}

              isHistory={true}
            />

            <FiltersBar
              taskNum={taskNum}
              setTaskNum={setTaskNum}

              deviceName={deviceName}
              setDeviceName={setDeviceName}

              deviceTypeFilter={deviceTypeFilter}
              setDeviceTypeFilter={setDeviceTypeFilter}

              addressFilter={addressFilter}
              setAddressFilter={setAddressFilter}

              deviceTypeOptions={deviceTypeOptions}
              addressOptions={addressOptions}

              closedAtDown={closedAtDown}
              setClosedAtDown={setClosedAtDown}

              closedAtUp={closedAtUp}
              setClosedAtUp={setClosedAtUp}

              isHistory={true}
            />
            {(taskNum !== '' ||
              deviceName !== '' ||
              deviceTypeFilter !== null ||
              addressFilter !== null ||
              closedAtDown !== null ||
              closedAtUp !== null) && (
                <Button size="small" type="text" onClick={handleClear}>
                  Очистить
                </Button>
              )}
          </Header>
          <Content
            style={{
              borderRadius: 5,
              flex: 1,
              background: '#fff',
              margin: '16px',
              display: 'flex',
              height: '100%',
            }}
          >
            {/* Левая колонка со списком карточек */}
            <div
              className="my-scroll"
              style={{
                flex: selectedTaskId ? 0.4 : 1,
                padding: '0 16px',
              }}>
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#fff',
                  zIndex: 1,
                  padding: '8px 0',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                }}
              >
                {['№ заявки', 'Конф. единица', 'Тип', 'Адрес', closeText].map(
                  (h, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>
                      {h}
                    </div>
                  )
                )}
              </div>
              {[...items]
                .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      if (selectedTaskId === task.id) {
                        setSelectedTaskId(null);
                      } else {
                        setSelectedTaskId(task.id);
                      }
                    }}
                    isCollapsed={!!selectedTaskId}
                    isSelected={selectedTaskId === task.id}
                  />
                ))}
              <Pagination
                align="end"
                defaultCurrent={1}
                total={total}
                current={currentPage}
                pageSize={fixedPageSize}
                onChange={(page) => {
                  setPage(page);
                }}
              />
            </div>

            {/* Вертикальный «барьер» */}
            {selectedTaskId && (
              <div
                style={{
                  width: 1,
                  backgroundColor: '#eee',
                  margin: '0 16px',
                }}
              />
            )}

            {/* Правая колонка — детали */}
            {selectedTaskId && (
              <div
                className="my-scroll"
                style={{ flex: 0.6 }}
              >
                {detailLoading && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      width: '100%',
                    }}
                  >
                    <MySpin />
                  </div>
                )}
                {detailError && <p style={{ color: 'red' }}>Ошибка загрузки заявки</p>}
                {selectedTaskDetail && (
                  <TaskDetailView
                    detail={selectedTaskDetail}
                    onClose={() => setSelectedTaskId(null)}
                  />
                )}
              </div>
            )}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
