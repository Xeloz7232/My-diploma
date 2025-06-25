import React from 'react';
import { Descriptions, Typography, Divider, Button, Form } from 'antd';
import { CloseOutlined, DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { TaskDetail } from '../../app/types';
import { formatDate } from '../../utils/date';
import { useRole } from '../../app/hooks';
import '../../index.css'
import { ApiError } from '../../components/myAntd/error-text-API';
import TextArea from 'antd/lib/input/TextArea';
import { useLazyDownloadConclusionQuery } from '../../app/services/taskApi';

const { Paragraph, Title } = Typography;

interface TaskDetailPanelProps {
  detail: TaskDetail;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailPanelProps> = ({ detail, onClose }) => {
  const userRoleId = useRole();

  const [form] = Form.useForm();

  const [downloadConclusion, { isLoading: isDownloading }] = useLazyDownloadConclusionQuery();

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
      a.download = filename;        // принудительный download
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <div style={{ padding: 16, background: '#fff', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Title level={4} style={{ margin: 0 }}> Заявка № {detail.task_number} </Title>
        </div>
        <Button type="text" onClick={onClose}>
          <CloseOutlined />
        </Button>
      </div>

      <div style={{ marginTop: 18 }} />
      <Descriptions.Item label="Статус">
        <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '16px' }}>
            Статус заявки: <strong>Закрыто</strong> ({formatDate(detail.closedAt)})
          </span>
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

          {!(userRoleId === 2) && <Descriptions.Item
            label="Комментарий"
            span={2} styles={{
              content: {
                paddingLeft: "12px",
                paddingRight: "12px",
              }
            }}>
            <Paragraph style={{ margin: 0 }}>
              {detail.commentary?.trim() ? detail.commentary : '—'}
            </Paragraph>

          </Descriptions.Item>}
        </Descriptions>
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
    </div>
  );
};