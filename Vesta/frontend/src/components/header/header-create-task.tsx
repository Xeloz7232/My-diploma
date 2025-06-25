import React, { useState } from 'react';
import { Button, Col, Divider, Form, Input, Row, Select, Space, Typography } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { useLazyGetSiriusDataQuery } from '../../app/services/dataApi';
import { useCreateTaskMutation } from '../../app/services/taskApi';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';
import { useGetDataQuery } from '../../app/services/dataApi';

const { Text } = Typography;

const AUTO_FIELDS = [
  'device_id',
  'device_brand',
  'device_model',
  'serial_number',
  'inventory_number',
  'device_type',
  'address',
  'user_name',
  'user_phone',
  'MOL_name',
  'MOL_phone',
  'company',
];

interface CreateTaskProps {
  setIsFormDirty: (dirty: boolean) => void;
  onCreated: () => void;
}

const extractErrorMessage = (
  err: FetchBaseQueryError | SerializedError | undefined
): string => {
  if (!err) return 'Не удалось создать заявку';

  if ('status' in err) {
    const fetchErr = err as FetchBaseQueryError;
    const data = fetchErr.data;
    if (
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as any).error === 'string'
    ) {
      return (data as any).error;
    }
    if (typeof data === 'string') {
      return data;
    }
    return `Ошибка ${fetchErr.status}`;
  }

  const serialErr = err as SerializedError;
  return serialErr.message ?? 'Не удалось создать заявку';
};

export const CreateTask: React.FC<CreateTaskProps> = ({
  setIsFormDirty,
  onCreated,
}) => {
  const [form] = Form.useForm();
  const [isFetched, setIsFetched] = useState(false);

  const { data } = useGetDataQuery();

  const addressOptions =
    data?.addresses.map(adr => ({ value: adr.name, label: adr.name })) ?? [];
  const deviceTypeOptions =
    data?.device_types.map(dt => ({ value: dt.name, label: dt.name })) ?? [];

  // замена на запрос по номеру заявки в Sirius
  const [getSiriusTask, { isLoading: isFetching }] =
    useLazyGetSiriusDataQuery();

  const [createTask, { isLoading: isCreating, isError, error }] =
    useCreateTaskMutation();

  // при нажатии «Заполнить» по номеру заявки
  const handleFill = async () => {
    const { task_number } = form.getFieldsValue(['task_number']);
    if (!task_number) return;
    try {
      const task = await getSiriusTask(task_number).unwrap();

      // Если сервер вернул null — показываем модальное окно
      if (task === null) {
        window.alert(`Заявка с номером "${task_number}" не найдена.`);
        setIsFetched(false);
        return;
      }

      // разбиваем префикс и цифры
      const { surname, name, patronymic } = task.MOL;
      const MOL_fullName = [surname, name, patronymic].filter(Boolean).join(' ');

      const user = task.device.users;
      const user_fullName = [user.surname, user.name, user.patronymic].filter(Boolean).join(' ');

      form.setFieldsValue({
        task_number: task.task_number,
        // device_name: deviceName,
        device_id: task.device.id,
        device_brand: task.device.brand_name,
        device_model: task.device.model,
        serial_number: task.device.serial_num,
        inventory_number: task.device.inventory_num,
        device_type: task.device.device_type.name,
        address: task.device.address.name,
        MOL_name: MOL_fullName,
        MOL_phone: task.MOL.phone_num,
        user_name: user_fullName,
        user_phone: task.device.users.phone_num,
        company: task.MOL.company.name,
      });
      setIsFetched(true);
    } catch (err) {
      console.error('Не удалось получить данные заявки', err);
      setIsFetched(false);
    }
  };

  const handleValuesChange = (_changed: any, all: any) => {
    if (_changed.task_number !== undefined) {
      setIsFetched(false);
      form.resetFields(AUTO_FIELDS);
    }

    const { task_number = '', description = '', commentary = '' } = all;

    const isDirty = [task_number, description, commentary]
      .some(v => typeof v === 'string' && v.trim() !== '');

    setIsFormDirty(isDirty);
  };

  const onFinish = async (values: any) => {
    const {
      task_number,
      device_id,
      device_brand,
      device_model,
      ...rest
    } = values;

    // здесь формируем нужное поле
    const device_name = `${device_id} - ${device_brand} ${device_model}`;

    try {
      await createTask({
        device_brand,
        device_name,
        ...rest,
        task_number,
      }).unwrap();

      onCreated();
      setIsFormDirty(false);
      form.resetFields();
      setIsFetched(false);
    } catch (err) {
      console.error('Ошибка при создании задачи', err);
    }
  };


  return (
    <>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        autoComplete="off"
      >
        <Form.Item label="Номер заявки" required>
          <Space.Compact style={{ width: '100%' }}>

            <Form.Item
              name="task_number"
              noStyle
              rules={[{ required: true, message: 'Пожалуйста, введите номер заявки' }]}
            >
              <Input
                style={{ width: '100%' }}
                placeholder="RITM1234567"
              />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {() => {
                const num = form.getFieldValue('task_number');
                return (
                  <Button
                    type="primary"
                    onClick={handleFill}
                    loading={isFetching}
                    disabled={!num}
                    style={{ width: 100 }}
                  >
                    Поиск
                  </Button>
                );
              }}
            </Form.Item>
          </Space.Compact >
        </Form.Item>

        <Divider>Данные техники</Divider>

        <Row gutter={16}>
          {/* <Col span={24}>
            <Form.Item
              name="device_name"
              label="Конфигурационная единица"
              rules={[
                { required: true, message: 'Пожалуйста, введите конфигурационную единицу' },
                {
                  pattern: /^[A-Za-z0-9]+ - .+$/,
                  message: 'Неверный формат. Должно быть “ABC1234 - HP Model 5678”',
                },
              ]}
            >
              <Input
                placeholder="ABC1234 - HP Model 5678"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col> */}
          <Col span={6}>
            <Form.Item
              name="device_id"
              label="Идентификатор"
              rules={[{ required: true, message: 'Пожалуйста, введите идентификатор' }]}
            >
              <Input
                placeholder="Идентификатор"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="device_brand"
              label="Производитель"
              rules={[{ required: true, message: 'Пожалуйста, введите производителя' }]}
            >
              <Input
                placeholder="Производитель"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="device_model"
              label="Модель"
              rules={[{ required: true, message: 'Пожалуйста, введите модель' }]}
            >
              <Input
                placeholder="Модель"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="serial_number"
              label="Серийный номер"
              rules={[{ required: true, message: 'Пожалуйста, введите серийный номер' }]}
            >
              <Input
                placeholder="Серийный номер"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="inventory_number"
              label="Инвентарный номер"
              rules={[{ required: true, message: 'Пожалуйста, введите инвентарный номер' }]}
            >
              <Input
                placeholder="Инвентарный номер"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="device_type"
              label="Тип устройства"
              rules={[{ required: true, message: 'Пожалуйста, введите тип устройства' }]}
            >
              {isFetched ? (
                <Input readOnly className="output_field" />
              ) : (
                <Select<number>
                  showSearch
                  allowClear
                  placeholder="Тип устройства"
                  options={deviceTypeOptions}
                />
              )}
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="address"
              label="Адрес"
              rules={[{ required: true, message: 'Пожалуйста, введите адрес' }]}
            >
              {isFetched ? (
                <Input readOnly className="output_field" />
              ) : (
                <Select<number>
                  showSearch
                  allowClear
                  placeholder="Адрес"
                  options={addressOptions}
                />
              )}
            </Form.Item>
          </Col>
        </Row>

        <Divider>Данные работников</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="user_name"
              label="ФИО конечного пользователя"
            >
              <Input
                placeholder="ФИО конечного пользователя"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="user_phone"
              label="Телефон конечного пользователя"
            >
              <Input
                placeholder="Телефон конечного пользователя"
                // когда isFetched — блокируем ввод и применяем ваш стиль
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="MOL_name"
              label="ФИО МОЛа"
            >
              <Input
                placeholder="ФИО МОЛа"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="MOL_phone"
              label="Телефон МОЛа"
            >
              <Input
                placeholder="Телефон МОЛа"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="company"
              label="Компания"
            >
              <Input
                placeholder="Компания"
                readOnly={isFetched}
                className={isFetched ? 'output_field' : ''}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Описание</Divider>

        {/* Описание и комментарий */}
        <Form.Item
          name="description"
          label="Описание"
          rules={[{ required: true, message: 'Пожалуйста, введите описание неисправности' }]}
        >
          <TextArea
            placeholder="Введите описание неисправности"
            autoSize={{ minRows: 2, maxRows: 2 }}
          />
        </Form.Item>
        <Form.Item name="commentary" label="Комментарий">
          <TextArea
            placeholder="Комментарий (виден только Вам)"
            autoSize={{ minRows: 2, maxRows: 2 }}
          />
        </Form.Item>

        {/* Кнопка Сохранить */}
        <Form.Item noStyle>
          <Row justify="end" align="middle">
            <Col>
              <Space size="middle">
                {isError && (
                  <Text type="danger">
                    {extractErrorMessage(error)}
                  </Text>
                )}
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isCreating}
                >
                  Сохранить
                </Button>
              </Space>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </>
  );
};
