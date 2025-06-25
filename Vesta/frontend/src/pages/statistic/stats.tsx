import React, { useState } from 'react';
import { Col, DatePicker, Layout, List, Modal, Row, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useGetStatisticQuery } from '../../app/services/dataApi';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../features/userSlice';
import { Navigate } from 'react-router-dom';
import { MainHeader } from '../../components/header/header';
import { Content } from 'antd/es/layout/layout';
import { ResponsiveContainer, Legend, BarChart, Bar, YAxis, XAxis, CartesianGrid, Line, LineChart, Tooltip } from 'recharts';
import MySpin from '../../components/myAntd/spin';
import { useRole } from '../../app/hooks';

const { Text, Title } = Typography;

export const Stats: React.FC = () => {
  const userRoleId = useRole();
  const COLORS = ['#0088FE', '#00C49F'];

  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>("");

  const isAuthenticated = useSelector(selectIsAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const [month, setMonth] = useState<Dayjs>(dayjs());
  const { data, isLoading, error } = useGetStatisticQuery({
    year: month.year(),
    month: month.month() + 1,
  });

  const durationData = data
    ? data.duration.labels.map((label, idx) => ({
      period: label,
      count: data.duration.counts[idx],
      numbers: data.duration.numbers[idx],
    }))
    : [];

  const allStatusData = data
    ? Object.entries(data.statusCounts).map(([key, info]) => ({
      key,                // например "one", "two"…
      name: info.name,    // человекочитаемое название
      value: info.count,  // численное значение
    }))
    : [];

  // 2. Фильтр по роли === 2, оставляем только те key, что нужны
  const barData =
    userRoleId === 2
      ? allStatusData.filter(d => d.key === 'two' || d.key === 'three')
      : allStatusData;

  const lineData = data
    ? data.labels.map((label, idx) => ({
      period: label,
      open: data.open[idx],
      closed: data.closed[idx],
    }))
    : [];

  const handleBarClick = (_: any, index: number) => {
    const { period, numbers } = durationData[index];
    setSelectedLabel(period);
    setSelectedTasks(numbers);
    setModalVisible(true);
  };

  return (
    <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MainHeader />
      <Layout style={{ flex: 1, backgroundColor: 'rgba(119,171,211,1)' }}>
        <Content
          style={{
            flex: 1,
            margin: 16,
            background: '#fff',
            borderRadius: 5,
            padding: 16,
          }}
        >
          <Row gutter={16} style={{ height: '100%' }}>
            {/* Левый столбец с первым графиком и легендой */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
                Количество открытых и закрытых заявок за месяц
              </Title>

              <DatePicker
                picker="month"
                value={month}
                onChange={d => d && setMonth(d)}
                style={{ marginBottom: 16, width: 200 }}
                format="MMMM YYYY"
                allowClear={false}
              />

              {isLoading && <MySpin />}
              {error && <div style={{ color: 'red' }}>Ошибка загрузки статистики</div>}

              {!isLoading && !error && data && (
                data.open.every(v => v === 0) && data.closed.every(v => v === 0) ? (
                  <Text type="secondary" style={{ marginTop: 32, fontSize: 16 }}>
                    Данные за выбранный период отсутствуют
                  </Text>
                ) : (
                  <div style={{ flex: 1, width: '100%', minHeight: 0, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend verticalAlign="bottom" align="center" />
                        <Line type="monotone" dataKey="open" name="Было открыто" stroke={COLORS[0]} />
                        <Line type="monotone" dataKey="closed" name="Было закрыто" stroke={COLORS[1]} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              )}
            </Col>

            {/* Правый столбец */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              {/* Секция 1: статусная гистограмма */}
              <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>
                Количество заявок по статусам
              </Title>

              <div
                style={{
                  width: '100%',
                  height: '40%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 0,
                }}
              >
                {barData.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    Данные по статусам отсутствуют
                  </Text>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar name="Количество" dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Секция 2: длительность пребывания */}
              <Title level={4} style={{ textAlign: 'center' }}>
                Время пребывания в ремонте
              </Title>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                (кликните по столбцу, чтобы увидеть номера заявок)
              </Text>

              <div style={{ flex: 1, width: '100%', display: 'flex', minHeight: 0, height: '60%', justifyContent: 'center', alignItems: 'center' }}>
                {durationData.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    Данные по длительности отсутствуют
                  </Text>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={durationData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar name="Число заявок" dataKey="count" fill="#8884d8" onClick={handleBarClick} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Col>
          </Row>
        </Content>
      </Layout>

      <Modal
        title={`Заявки: ${selectedLabel}`}
        open={isModalVisible}
        footer={
          <div style={{ width: '100%', textAlign: 'center' }}>
            <Text type="secondary" style={{ marginTop: 32, fontSize: 16 }}>
              Нажмите вне модального окна чтобы закрыть
            </Text>
          </div>}
        onCancel={() => setModalVisible(false)}
      >
        <List
          size="small"
          bordered
          dataSource={selectedTasks}
          renderItem={item => <List.Item>{item}</List.Item>}
        />
      </Modal>
    </Layout>
  );
};
