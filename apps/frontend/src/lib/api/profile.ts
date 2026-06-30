import { api } from '@/lib/api';

export async function updateProfile(data: { name?: string; email?: string }) {
  const res = await api.patch('/users/me', data);
  return res.data;
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
  await api.patch('/users/me/password', data);
}
