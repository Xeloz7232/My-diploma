import React, { useState } from 'react';
import { Descriptions, Typography, Divider, Button, Input, Modal, Form, Space, Upload, Radio } from 'antd';
import { EditOutlined, DeleteOutlined, SaveOutlined, UndoOutlined, CloseOutlined, InboxOutlined, FilePdfOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import type { TaskDetail } from '../../app/types';
import { formatDate } from '../../utils/date';
import { useUpdateTaskMutation, useDeleteTaskMutation, useLazyDownloadConclusionQuery, useLazyActPrintingQuery } from '../../app/services/taskApi';
import { StatusStepper } from '../../components/status-stepper';
import { useRole } from '../../app/hooks';
import { ApiError } from '../../components/myAntd/error-text-API';
import { useUploadConclusionMutation } from '../../app/services/taskApi';
import { RcFile } from 'antd/lib/upload';

const { Paragraph, Title } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

const rolePermissions: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 1,
  5: 1,
};

interface TaskDetailPanelProps {
  statusOptions: { id: number; name: string }[];
  detail: TaskDetail;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailPanelProps> = ({ statusOptions, detail, onClose }) => {
  const userRoleId = useRole();

  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [conclusionMode, setConclusionMode] = useState<'text' | 'file'>('text');
  const [conclusionText, setConclusionText] = useState('');
  const [conclusionFile, setConclusionFile] = useState<RcFile | null>(null);
  const [isConclusionModalVisible, setConclusionModalVisible] = useState(false);
  const [uploadConclusion] = useUploadConclusionMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [downloadConclusion, { isFetching: isDownloading }] = useLazyDownloadConclusionQuery();
  const [actPrinting, { isFetching: isPrinting }] = useLazyActPrintingQuery();

  //Печать
  const handlePrint = async () => {
    try {
      const blob = await actPrinting(detail.id).unwrap();
      const objectUrl = URL.createObjectURL(blob);
      const filename = `Акт_${detail.task_number}.pdf`;

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

  const handleDownload = async () => {
    try {
      // 1) Получаем blob
      const blob = await downloadConclusion(detail.id).unwrap();

      // 2) Вычисляем имя файла (берём из URL поля repair_conclusion.url)
      const url = detail.repair_conclusion!.url!;
      const filename = decodeURIComponent(
        new URL(url, window.location.origin).pathname.split('/').pop()!
      );

      // 3) Создаём временный <a> и кликаем по нему
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Ошибка скачивания', error);
    }
  };

  const handleStatusChange = async (nextStatusId: number) => {
    if (nextStatusId === 4) {
      setConclusionModalVisible(true);
      return;
    }
    await updateTask({ id: detail.id, status_id: nextStatusId }).unwrap();
    if (nextStatusId === 6) {
      onClose();
    }
  };

  const [initialValues] = useState({
    status_id: detail.statuses.id,
    commentary: detail.commentary,
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    await updateTask({ id: detail.id, ...values }).unwrap();
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteModalVisible(false);
      onClose();

      await new Promise(resolve => setTimeout(resolve, 300));

      await deleteTask(detail.id).unwrap();

    } catch (error) {
      console.error('Ошибка при удалении заявки:', error);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
  };
  const handleConclusionOk = async () => {
    if (conclusionMode === 'text' && !conclusionText.trim()) {
      window.alert('Нужно ввести текст заключения');
      return;
    }
    if (conclusionMode === 'file' && !conclusionFile) {
      window.alert('Нужно выбрать файл');
      return;
    }

    try {
      // Подготавливаем FormData
      const formData = new FormData();
      if (conclusionMode === 'text') {
        formData.append('text', conclusionText.trim());
      } else if (conclusionFile) {
        formData.append('conclusion', conclusionFile);
      }

      // Отправляем
      await uploadConclusion({
        task_id: detail.id.toString(),
        text: conclusionMode === 'text' ? conclusionText : undefined,
        file: conclusionMode === 'file' ? conclusionFile! : undefined,
      }).unwrap();

      await updateTask({ id: detail.id, status_id: 4 }).unwrap();
      setConclusionModalVisible(false);
      onClose();
    } catch (error) {
      console.error(error);
      window.alert('Ошибка при отправке заключения');
    }
  };

  return (
    <div style={{ padding: 16, background: '#fff', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Title level={4} style={{ margin: 0 }}> Заявка № {detail.task_number} </Title>
          {(userRoleId != 2) && false && <Button icon={<DeleteOutlined />} onClick={() => setDeleteModalVisible(true)} type="primary" danger />}
          {((userRoleId != 2) &&
            ((detail.statuses.id === 2) ||
              (detail.statuses.id === 1))) &&
            <Button type="default" onClick={handlePrint} loading={isPrinting}>
              <PrinterOutlined /> Акт на ремонт
            </Button>}
        </div>
        <Button type="text" onClick={onClose}>
          <CloseOutlined />
        </Button>
      </div>

      <div style={{ marginTop: 18 }} />
      <Descriptions.Item label="Статус">
        <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '16px' }}>
            Статус заявки: <strong>{detail.statuses.name}</strong>
          </span>
          {rolePermissions[detail.statuses.id] === userRoleId && (
            <StatusStepper
              statuses={statusOptions}
              currentStatusId={detail.statuses.id}
              onChange={handleStatusChange}
              userRoleId={userRoleId}
              rolePermissions={rolePermissions}
            />
          )}
        </div>
      </Descriptions.Item>

      <Divider />

      <Form form={form} layout="vertical" initialValues={{
        status_id: detail.statuses.id,
        commentary: detail.commentary,
      }}>

        <Descriptions
          column={2}
          bordered
          style={{ width: '100%' }}
          size="small"
          labelStyle={{ width: '20%', }}
          contentStyle={{ width: 250, }}
        >
          {!(userRoleId === 2) && <Descriptions.Item
            label="Дата отправки"
            span={1}
            styles={{
              content: {
                textAlign: "center",
                justifyContent: "center",
                alignItems: "center",
              }
            }}>
            {formatDate(detail.date_out)}
          </Descriptions.Item>}
          {!(userRoleId === 2) && <Descriptions.Item
            label="Дата приёма"
            span={1}
            styles={{
              content: {
                textAlign: "center",
                justifyContent: "center",
                alignItems: "center",
              }
            }}>
            {formatDate(detail.date_in)}
          </Descriptions.Item>}
          <Descriptions.Item
            label="Устройство"
            span={2}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.device_full_name != null
              ? (`${detail.device_full_name} | ${detail.device_type}`)
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="Инв. №"
            span={1}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.inventory_number != null
              ? `${detail.inventory_number}`
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="Серийный №"
            span={1}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.serial_number != null
              ? `${detail.serial_number}`
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="МОЛ"
            span={1}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.MOL_name != null
              ? `${detail.MOL_name}`
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="Телефон МОЛа"
            span={1}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.MOL_phone != null
              ? `${detail.MOL_phone}`
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="Пользователь"
            span={1}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.user_name != null
              ? `${detail.user_name}`
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="Телефон пользователя"
            span={1}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.user_phone != null
              ? `${detail.user_phone}`
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="Адрес"
            span={2}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.address != null
              ? `${detail.address}`
              : <ApiError />}
          </Descriptions.Item>
          <Descriptions.Item
            label="Подразделение"
            span={2}
            styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            {detail.company != null
              ? `${detail.company}`
              : <ApiError />}
          </Descriptions.Item>

          <Descriptions.Item
            label="Описание"
            span={2} styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            <Paragraph>{detail.description || '—'}</Paragraph>
          </Descriptions.Item>

          {!(userRoleId === 2) && (
            <Descriptions.Item label="Комментарий" span={2}>
              {isEditing ? (
                <Form.Item name="commentary" style={{ margin: 0 }}>
                  <Input.TextArea placeholder="Комментарий" />
                </Form.Item>
              ) : (
                <Space>
                  <Paragraph style={{ margin: 0 }}>
                    {detail.commentary?.trim() || '—'}
                  </Paragraph>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      form.setFieldsValue({ commentary: detail.commentary });
                      setIsEditing(true);
                    }}
                  />
                </Space>
              )}
            </Descriptions.Item>
          )}
        </Descriptions>
        {isEditing && (
          <Space style={{ margin: '20px' }}>
            <Button type="primary" onClick={handleSave} icon={<SaveOutlined />}>Сохранить</Button>
            <Button icon={<UndoOutlined />} onClick={() => {
              form.setFieldsValue(initialValues);
              setIsEditing(false);
            }}>
              Отменить
            </Button>
          </Space>
        )}
      </Form>

      {detail.repair_conclusion && (
        <>
          <Divider>
            <Title level={4} style={{ margin: 0 }}>
              Заключение по ремонту
            </Title>
          </Divider>

          {detail.repair_conclusion.url ? (
            (() => {
              const url = detail.repair_conclusion.url;
              // вытаскиваем имя и расширение
              const pathname = new URL(url, window.location.origin).pathname;
              const filename = decodeURIComponent(pathname.split('/').pop() || '');
              const ext = (filename.match(/\.(\w+)$/i)?.[1] || '').toLowerCase();

              // определяем, это картинка или pdf
              const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

              return (
                <div
                  style={{
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 12,
                  }}
                >
                  {/* превью */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', cursor: 'pointer' }}
                  >
                    {isImage ? (
                      <img
                        src={url}
                        alt={filename}
                        style={{
                          width: 64,
                          height: 64,
                          objectFit: 'cover',
                          borderRadius: 4,
                        }}
                      />
                    ) : (
                      <FilePdfOutlined style={{ fontSize: 48, color: '#d93025' }} />
                    )}
                  </a>

                  {/* кнопка скачивания */}
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    loading={isDownloading}
                    onClick={handleDownload}
                  >
                    {filename}
                  </Button>
                </div>
              );
            })()
          ) : (
            <TextArea
              readOnly
              value={detail.repair_conclusion.text || ''}
              rows={4}
              style={{
                width: '100%',
                resize: 'none',
                padding: 12,
                background: '#fff',
              }}
            />
          )}
        </>
      )}

      <div style={{ height: 24 }} />

      {/* Модальное окно удаления */}
      <Modal
        title="Удалить заявку?"
        centered
        open={isDeleteModalVisible}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText="Да"
        cancelText="Отмена"
      >
        <p>Вы уверены, что хотите удалить заявку № {detail.task_number}?</p>
      </Modal>

      {/* Модальное окно заключения */}
      <Modal
        title="Заключение по ремонту"
        centered
        open={isConclusionModalVisible}
        onOk={handleConclusionOk}
        onCancel={() => {
          setConclusionModalVisible(false);
          setConclusionText('');
          setConclusionFile(null);
        }}
        okText="Готово"
        cancelText="Отмена"
        maskClosable={false}
      >
        <Title level={5}>Выберите способ ввода</Title>
        <Radio.Group
          onChange={e => {
            setConclusionMode(e.target.value);
            // чистим лишние данные при переключении
            setConclusionText('');
            setConclusionFile(null);
          }}
          value={conclusionMode}
          style={{ marginBottom: 16 }}
        >
          <Radio.Button value="text">Текст</Radio.Button>
          <Radio.Button value="file">Файл</Radio.Button>
        </Radio.Group>

        {conclusionMode === 'text' && (
          <TextArea
            rows={3}
            placeholder="Введите текст заключения"
            value={conclusionText}
            onChange={e => setConclusionText(e.target.value)}
          />
        )}

        {conclusionMode === 'file' && (
          <>
            {!conclusionFile ? (
              <Dragger
                multiple={false}
                accept="image/*,application/pdf"
                beforeUpload={(file) => {
                  setConclusionFile(file);
                  return false;
                }}
                style={{ padding: 16 }}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Перетащите файл сюда или нажмите для выбора</p>
                <p className="ant-upload-hint">Поддерживаются изображения и PDF.</p>
              </Dragger>
            ) : (
              <div
                style={{
                  position: 'relative',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  padding: 16,
                  background: '#fafafa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Кнопка удаления */}
                <DeleteOutlined
                  onClick={() => setConclusionFile(null)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                />

                {/* Если PDF — иконка + имя, иначе — превью изображения */}
                {conclusionFile.type === 'application/pdf' ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      gap: 12,
                    }}
                  >
                    <FilePdfOutlined style={{ fontSize: 32, color: '#d93025' }} />
                    <div
                      style={{
                        flex: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={conclusionFile.name}
                    >
                      {conclusionFile.name}
                    </div>
                  </div>
                ) : (
                  <img
                    src={URL.createObjectURL(conclusionFile)}
                    alt={conclusionFile.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 200,   // высота превью
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};