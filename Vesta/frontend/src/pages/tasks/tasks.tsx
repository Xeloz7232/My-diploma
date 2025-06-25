import '../../index.css'
import React, { useEffect, useState } from 'react';
import { Button, Layout, Pagination } from 'antd';
import { MainHeader } from '../../components/header/header';
import { useGetDataQuery } from '../../app/services/dataApi';
import { useGetAllTasksQuery, useGetTaskByIdQuery, useTakeawayPrintingMutation } from '../../app/services/taskApi';
import { TaskCard } from './task-card';
import { FilterDropdown } from '../../components/filter';
import { FiltersBar } from '../../components/filter-bar';
import { TaskDetailView } from './task-detail-panel';
import MySpin from '../../components/myAntd/spin';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectIsAuthenticated } from '../../features/userSlice';
import { useRole } from '../../app/hooks';
import { PrinterOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

export const Tasks: React.FC = () => {
  const userRoleId = useRole();

  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const { data, isLoading } = useGetDataQuery();
  const [takeawayPrinting, { isLoading: isTakeawayPrinting }] = useTakeawayPrintingMutation();

  const [taskNum, setTaskNum] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<number | null>(null);
  const [addressFilter, setAddressFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const fixedPageSize = 50;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [takeaway, setTakeaway] = useState<boolean>(false)
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // список карт задач с фильтрами
  const queryParams: Record<string, any> = {
    task_number: taskNum || undefined,
    device_name: deviceName || undefined,
    device_type_id: deviceTypeFilter ?? undefined,
    address_id: addressFilter ?? undefined,
    page,
    pageSize: fixedPageSize,
    takeaway,
  };

  if (takeaway) {
    queryParams.status_ids = [1, 2];
  } else if (statusFilter !== null) {
    queryParams.status_id = statusFilter;
  }

  const { data: tasks } = useGetAllTasksQuery(queryParams);

  const handlePrint = async () => {
    try {
      const blob = await takeawayPrinting(checkedIds).unwrap();
      const objectUrl = URL.createObjectURL(blob);
      const filename = `Согласование_на_вынос_12-${new Date().toLocaleDateString("ru", { year: "2-digit" })}.pdf`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Не удалось открыть окно");

      // Поместим revoke внутрь onload
      printWindow.document.write(`
      <html>
        <head>
          <title>${filename}</title>
          <style>body, html { margin:0; height:100%; }</style>
        </head>
        <body>
          <iframe
            src="${objectUrl}"
            style="border:none; width:100%; height:100%;"
            onload="
              this.contentWindow.focus();
              this.contentWindow.print();
              URL.revokeObjectURL('${objectUrl}');
            "
          ></iframe>
        </body>
      </html>
    `);
      printWindow.document.close();

    } catch (err) {
      console.error("Ошибка печати:", err);
    }
  };

  const handleClear = async () => {
    setTaskNum('')
    setDeviceName('')
    setDeviceTypeFilter(null)
    setAddressFilter(null)
    setStatusFilter(null)
  }

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setCheckedIds(prev => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      } else {
        return prev.filter(item => item !== id);
      }
    });
  };

  const toggleTakeaway = () => {
    if (takeaway) {
      setCheckedIds([]);
    } else {
      setStatusFilter(null);
      setCheckedIds([]);
    }
    setTakeaway(prev => !prev);
  };


  const items = tasks?.items ?? [];

  const total = tasks?.total ?? 0;
  const currentPage = page!;

  useEffect(() => {
    setPage(1);
  }, [taskNum, deviceName, deviceTypeFilter, addressFilter, statusFilter]);


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
  const statusOptions =
    data?.statuses.map(s => ({ value: s.id, label: s.name })) ?? [];
  const filteredStatusOptions = statusOptions.filter(opt => opt.value !== 6);

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

              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}

              statusOptions={filteredStatusOptions}
              deviceTypeOptions={deviceTypeOptions}
              addressOptions={addressOptions}

              isTakeaway={takeaway}

              loading={isLoading}

              isHistory={false}
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

              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}

              statusOptions={statusOptions}
              deviceTypeOptions={deviceTypeOptions}
              addressOptions={addressOptions}

              isTakeaway={takeaway}

              isHistory={false}
            />
            {(taskNum !== '' ||
              deviceName !== '' ||
              deviceTypeFilter !== null ||
              addressFilter !== null ||
              statusFilter !== null) &&
              <Button size="small" type="text" onClick={handleClear}>
                Очистить
              </Button>
            }
            {userRoleId === 1 && <div style={{ marginLeft: 'auto' }}>
              {takeaway &&
                <Button
                  type="primary"
                  style={{
                    marginRight: 10,
                  }}
                  onClick={handlePrint}
                  loading={isTakeawayPrinting}
                >
                  <PrinterOutlined />
                </Button>}
              <Button
                type={takeaway ? 'default' : 'primary'}
                onClick={toggleTakeaway}
              >
                {takeaway ? 'Отмена' : 'Согласование на вынос'}
              </Button>
            </div>}
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
                {['№ заявки', 'Конф. единица', 'Тип', 'Адрес', 'Статус'].map(
                  (h, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>
                      {h}
                    </div>
                  )
                )}
                {takeaway && <div style={{ marginRight: 30 }} />}
              </div>
              {[...items]
                .filter(task => task.statuses.id !== 6)
                .sort((a, b) => {
                  // Если статус 4 (Готово), ставим выше
                  if (a.statuses.id === 4 && b.statuses.id !== 4) return -1;
                  if (b.statuses.id === 4 && a.statuses.id !== 4) return 1;

                  // Если статус 5 (Закрыта), ставим после Готово, но перед остальными
                  if (a.statuses.id === 5 && b.statuses.id !== 5) return -1;
                  if (b.statuses.id === 5 && a.statuses.id !== 5) return 1;

                  // Если оба не 4 и не 5 — сортируем по дате создания (новее выше)
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
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
                    onCheckboxChange={handleCheckboxChange}
                    isChecked={checkedIds.includes(task.id)}
                    isTakeaway={takeaway}
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
                    statusOptions={data?.statuses ?? []}
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
