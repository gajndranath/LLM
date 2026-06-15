import { useState, useEffect } from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, Settings, Save, X } from 'lucide-react';
import { superAdminApi } from '../api/auth.api';
import { toast } from 'sonner';

export const PlansManager = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const fetchPlans = async () => {
    try {
      const { api } = await import('../api/axiosInstance');
      // We need an endpoint to fetch all plans including inactive ones for Super Admin.
      // Assuming GET /billing/plans fetches only active. We should use a super-admin specific one or modify billing to take a param.
      // Wait, let's just use GET /billing/plans for now and we will fix the backend if needed to return all for admin.
      // Let's create a specific super admin fetch.
      const res = await api.get('/super-admin/plans');
      setPlans(res.data.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggle = async (planId: string) => {
    try {
      await superAdminApi.togglePlanStatus(planId);
      toast.success('Plan status updated');
      fetchPlans();
    } catch {
      toast.error('Failed to toggle plan status');
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...editForm,
        price_cents: parseInt(editForm.price_cents, 10),
        max_connections: parseInt(editForm.max_connections, 10),
        max_staff: parseInt(editForm.max_staff, 10),
        max_queries_per_day: parseInt(editForm.max_queries_per_day, 10),
        features: typeof editForm.features === 'string' ? editForm.features.split('\n').filter(Boolean) : editForm.features
      };

      if (isEditing === 'new') {
        await superAdminApi.createPlan(payload);
        toast.success('Plan created successfully');
      } else {
        await superAdminApi.updatePlan(isEditing as string, payload);
        toast.success('Plan updated successfully');
      }
      
      setIsEditing(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    }
  };

  const startEdit = (plan: any) => {
    setIsEditing(plan.id);
    setEditForm({
      ...plan,
      features: plan.features.join('\n')
    });
  };

  const startCreate = () => {
    setIsEditing('new');
    setEditForm({
      code: '',
      name: '',
      description: '',
      price_cents: 0,
      currency: 'INR',
      max_connections: 1,
      max_staff: 2,
      max_queries_per_day: 50,
      features: '',
      is_custom: false
    });
  };

  if (loading) return <div>Loading plans...</div>;

  return (
    <div className="glass rounded-3xl p-6 border border-white/5 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-white text-xl flex items-center space-x-2">
          <Settings className="text-amber-400" />
          <span>Subscription Plans Manager</span>
        </h2>
        <button 
          onClick={startCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 transition-colors"
        >
          <Plus size={16} />
          <span>Create New Plan</span>
        </button>
      </div>

      {(isEditing && editForm) ? (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">{isEditing === 'new' ? 'Create Plan' : 'Edit Plan'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Code (e.g. basic, pro)</label>
              <input type="text" value={editForm.code} onChange={e => setEditForm({...editForm, code: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Display Name</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <input type="text" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Price (in cents/paise)</label>
              <div className="flex space-x-2">
                <select value={editForm.currency} onChange={e => setEditForm({...editForm, currency: e.target.value})} className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white w-24">
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <input type="number" value={editForm.price_cents} onChange={e => setEditForm({...editForm, price_cents: e.target.value})} className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max Connections</label>
              <input type="number" value={editForm.max_connections} onChange={e => setEditForm({...editForm, max_connections: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max Staff</label>
              <input type="number" value={editForm.max_staff} onChange={e => setEditForm({...editForm, max_staff: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max Queries / Day</label>
              <input type="number" value={editForm.max_queries_per_day} onChange={e => setEditForm({...editForm, max_queries_per_day: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Features (One per line)</label>
              <textarea rows={4} value={editForm.features} onChange={e => setEditForm({...editForm, features: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm"></textarea>
            </div>
          </div>
          <div className="flex space-x-3 mt-6">
            <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center space-x-2">
              <Save size={16} /> <span>Save Plan</span>
            </button>
            <button onClick={() => { setIsEditing(null); }} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl font-bold flex items-center space-x-2">
              <X size={16} /> <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Plan Name</th>
              <th className="px-6 py-4 font-medium">Price</th>
              <th className="px-6 py-4 font-medium">Limits (Conn/Staff/Query)</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-white">{plan.name}</p>
                  <p className="text-xs text-slate-500 uppercase">{plan.code}</p>
                </td>
                <td className="px-6 py-4 text-slate-300">
                  {plan.price_cents === 0 ? 'Free' : `${plan.currency} ${plan.price_cents / 100}`}
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">
                  {plan.max_connections} / {plan.max_staff} / {plan.max_queries_per_day}
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggle(plan.id)} className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full ${plan.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {plan.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span>{plan.is_active ? 'Active' : 'Disabled'}</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => startEdit(plan)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
