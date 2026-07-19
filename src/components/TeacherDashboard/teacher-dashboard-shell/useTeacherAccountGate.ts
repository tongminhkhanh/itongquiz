import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../../stores/authStore';
import { callApi } from '../../../services/apiAdapter';
import { getJWTPurpose, getStoredJWTToken } from '../../../services/api/auth';
import { ApiError } from '../../../services/api/errors';
import { showError } from '../../../utils/toast';
import type { PasswordGateState } from './types';

export const useTeacherAccountGate = () => {
  const authStore = useAuthStore();
  const navigate = useNavigate();
  const [passwordGate, setPasswordGate] = useState<PasswordGateState | null>(null);

  useEffect(() => {
    if (!authStore.isLoggedIn) return;
    let active = true;
    const token = getStoredJWTToken('/api/account/me');
    const tokenPurpose = getJWTPurpose(token);
    callApi<{ data?: { mustChangePassword?: boolean } }>('get_account_profile')
      .then(response => {
        if (active && response.data?.mustChangePassword && token) {
          setPasswordGate({ token, requireCurrentPassword: tokenPurpose !== 'password_change' });
        }
      })
      .catch(error => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          authStore.logout();
          setPasswordGate(null);
          showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          navigate('/', { replace: true });
          return;
        }
        if (token && (tokenPurpose === 'password_change' || String(error).includes('Password change required'))) {
          setPasswordGate({ token, requireCurrentPassword: tokenPurpose !== 'password_change' });
        }
      });
    return () => { active = false; };
  }, [authStore.isLoggedIn, authStore.username]);

  const completePasswordChange = (token: string) => {
    authStore.loginSuccess(
      authStore.username || '',
      authStore.teacherName || authStore.username || '',
      authStore.isAdmin,
      authStore.teacherClass,
      token,
    );
    setPasswordGate(null);
  };

  return { passwordGate, completePasswordChange };
};
