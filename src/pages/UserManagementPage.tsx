import React from 'react';
import { Card, Table, Tag } from 'antd';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import { User as UserIcon } from 'lucide-react';

const UserManagementPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div className="text-center py-20 text-gray-400">未登录，无法查看用户信息。</div>;
  }

  // 这里只显示当前登录用户
  const dataSource = [
    {
      id: user.id,
      email: user.email,
      created_at: '', // 如有注册时间可补充
      role: 'user', // 如有角色可补充
      status: 'enabled', // 如有状态可补充
    },
  ];

  return (
    <div>
      <Card
        className="rounded-2xl shadow-xl border-l-4 border-blue-400"
        style={{ marginBottom: 32 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="h-10 w-2 rounded bg-gradient-to-b from-blue-500 to-purple-400 mr-2" />
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-500 rounded-full p-3 shadow-sm">
                <UserIcon size={20} />
              </div>
              <span className="text-2xl font-bold text-gray-800 tracking-tight">用户管理</span>
            </div>
          </div>
        }
      >
        <Table
          columns={[
            { title: '邮箱', dataIndex: 'email', key: 'email' },
            { title: '角色', dataIndex: 'role', key: 'role', render: (role) => (
              <Tag color={role === 'admin' ? 'blue' : 'default'}>{role === 'admin' ? '管理员' : '普通用户'}</Tag>
            ) },
            { title: '注册时间', dataIndex: 'created_at', key: 'created_at', render: (t) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (status) => (
              <Tag color={status === 'enabled' ? 'green' : 'red'}>{status === 'enabled' ? '启用' : '禁用'}</Tag>
            ) },
          ]}
          dataSource={dataSource}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default UserManagementPage; 