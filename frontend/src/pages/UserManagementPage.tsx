import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

interface User {
  id: number;
  username: string;
  email: string;
  usertype_id: number;
  usertype_name: string | null;
}

interface UserType {
  id: number;
  name: string;
}

export const UserManagementPage: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, typesRes] = await Promise.all([
        apiService.getUsers(),
        apiService.getUserTypes(),
      ]);
      setUsers(usersRes.users || []);
      setUserTypes(typesRes.usertypes || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTypeChange = async (userId: number, newTypeId: number) => {
    try {
      await apiService.updateUserType(userId, newTypeId);
      showToast('تم تحديث صلاحيات المستخدم', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث الصلاحيات', 'error');
    }
  };

  const handleDelete = async (userId: number, username: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟`)) return;
    try {
      await apiService.deleteUser(userId);
      showToast('تم حذف المستخدم بنجاح', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف المستخدم', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>إدارة المستخدمين</h1>
      </header>

      <div className="card">
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الصلاحية</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td><strong>{user.username}</strong></td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.usertype_id}
                        onChange={(e) => handleTypeChange(user.id, parseInt(e.target.value))}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: user.usertype_id === 1 ? '#eff6ff' : '#f8fafc',
                          color: user.usertype_id === 1 ? '#1e40af' : '#475569',
                        }}
                      >
                        {userTypes.map((type) => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn-danger"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleDelete(user.id, user.username)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
