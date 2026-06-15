import { api } from './axiosInstance';

export const authApi = {
  sendOtp: async (email: string) => {
    const { data } = await api.post('/auth/send-otp', { email });
    return data;
  },
  register: async (payload: any) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },
  registerOrg: async (payload: {
    companyName: string;
    adminName: string;
    email: string;
    password: string;
    plan: 'free' | 'pro' | 'mega';
    otp: string;
  }) => {
    const { data } = await api.post('/auth/register-org', payload);
    return data;
  },
  login: async (payload: any) => {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },
  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },
};

export const adminApi = {
  // Staff management
  inviteStaff: async (payload: { email: string; role: string; name?: string }) => {
    const { data } = await api.post('/admin/staff/invite', payload);
    return data;
  },
  listStaff: async () => {
    const { data } = await api.get('/admin/staff');
    return data;
  },
  updateRole: async (staffId: string, role: string) => {
    const { data } = await api.put(`/admin/staff/${staffId}/role`, { role });
    return data;
  },
  toggleStatus: async (staffId: string, isActive: boolean) => {
    const { data } = await api.put(`/admin/staff/${staffId}/status`, { isActive });
    return data;
  },
  removeStaff: async (staffId: string) => {
    const { data } = await api.delete(`/admin/staff/${staffId}`);
    return data;
  },
  cancelInvite: async (inviteId: string) => {
    const { data } = await api.delete(`/admin/invites/${inviteId}`);
    return data;
  },
  resendInvite: async (inviteId: string) => {
    const { data } = await api.post(`/admin/invites/${inviteId}/resend`);
    return data;
  },
  getBilling: async () => {
    const { data } = await api.get('/admin/billing');
    return data;
  },
  cancelPlan: async () => {
    const { data } = await api.post('/billing/cancel-plan');
    return data;
  },
  // Invite flow (public)
  getInvite: async (token: string) => {
    const { data } = await api.get(`/admin/invite/${token}`);
    return data;
  },
  acceptInvite: async (token: string, payload: { name: string; password: string }) => {
    const { data } = await api.post(`/admin/invite/${token}/accept`, payload);
    return data;
  },
};

export const superAdminApi = {
  getStats: async () => {
    const { data } = await api.get('/super-admin/stats');
    return data;
  },
  getQueryAnalytics: async (days = 30) => {
    const { data } = await api.get(`/super-admin/analytics/queries?days=${days}`);
    return data;
  },
  getTopOrgs: async (limit = 5) => {
    const { data } = await api.get(`/super-admin/analytics/top-orgs?limit=${limit}`);
    return data;
  },
  getRecentSignups: async (limit = 10) => {
    const { data } = await api.get(`/super-admin/analytics/recent-signups?limit=${limit}`);
    return data;
  },
  listOrganizations: async (params: { page?: number; limit?: number; search?: string; plan?: string }) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.plan) query.set('plan', params.plan);
    const { data } = await api.get(`/super-admin/organizations?${query.toString()}`);
    return data;
  },
  getOrgDetail: async (orgId: string) => {
    const { data } = await api.get(`/super-admin/organizations/${orgId}`);
    return data;
  },
  updateOrgPlan: async (orgId: string, plan: string) => {
    const { data } = await api.put(`/super-admin/organizations/${orgId}/plan`, { plan });
    return data;
  },
  toggleOrgStatus: async (orgId: string, isActive: boolean) => {
    const { data } = await api.put(`/super-admin/organizations/${orgId}/status`, { isActive });
    return data;
  },
  // Plans Management
  createPlan: async (payload: any) => {
    const { data } = await api.post('/super-admin/plans', payload);
    return data;
  },
  updatePlan: async (planId: string, payload: any) => {
    const { data } = await api.put(`/super-admin/plans/${planId}`, payload);
    return data;
  },
  togglePlanStatus: async (planId: string) => {
    const { data } = await api.patch(`/super-admin/plans/${planId}/toggle`);
    return data;
  },
  // Financials
  getTransactions: async (page = 1, limit = 20) => {
    const { data } = await api.get(`/super-admin/transactions?page=${page}&limit=${limit}`);
    return data;
  },
  getFinancialAnalytics: async () => {
    const { data } = await api.get('/super-admin/analytics/finance');
    return data;
  },
  getUnpaidOrgs: async () => {
    const { data } = await api.get('/super-admin/analytics/unpaid');
    return data;
  },
  remindUnpaidOrg: async (orgId: string) => {
    const { data } = await api.post('/super-admin/remind-unpaid', { orgId });
    return data;
  }
};
