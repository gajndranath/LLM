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

      {/* ── SUPER ADMIN PROMO COUPONS GENERATOR ── */}
      <div className="mt-12 pt-8 border-t border-white/10">
        <CouponManagerSection />
      </div>
    </div>
  );
};

const CouponManagerSection = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [discount, setDiscount] = useState(100);
  const [maxUses, setMaxUses] = useState(1);
  const [targetPlan, setTargetPlan] = useState('mega');
  const [creating, setCreating] = useState(false);

  const fetchCoupons = async () => {
    try {
      const { api } = await import('../api/axiosInstance');
      const res = await api.get('/super-admin/coupons');
      setCoupons(res.data.data);
    } catch (_) {}
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleGenerate = async () => {
    if (!campaignName.trim()) return toast.error('Enter campaign/coupon name');
    if (!autoGenerateCode && !couponCode.trim()) return toast.error('Enter custom coupon code');
    setCreating(true);
    try {
      const { api } = await import('../api/axiosInstance');
      const res = await api.post('/super-admin/coupons/generate', {
        name: campaignName.trim(),
        code: autoGenerateCode ? '' : couponCode.trim().toUpperCase(),
        discountPercent: Number(discount) || 100,
        maxUses: Number(maxUses) || 1,
        isLifetime: true,
        targetPlan
      });
      toast.success(`🎟️ Coupon ${res.data.data.code} Generated Successfully!`);
      setCampaignName('');
      setCouponCode('');
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleCoupon = async (id: string) => {
    try {
      const { api } = await import('../api/axiosInstance');
      await api.put(`/super-admin/coupons/${id}/toggle`);
      toast.success('Coupon status updated');
      fetchCoupons();
    } catch {
      toast.error('Failed to update coupon status');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Permanently purge this coupon?')) return;
    try {
      const { api } = await import('../api/axiosInstance');
      await api.delete(`/super-admin/coupons/${id}`);
      toast.success('Coupon purged');
      fetchCoupons();
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎟️</span> <span>Enterprise Promo & God-Mode Coupon Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Cryptographically secure coupon generation with campaign attribution.</p>
        </div>
      </div>

      <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Campaign / Coupon Name</label>
            <input
              type="text"
              placeholder="e.g. VIP Founder Early Access"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase text-slate-400">Coupon Code</label>
              <button
                type="button"
                onClick={() => setAutoGenerateCode(!autoGenerateCode)}
                className="text-[10px] text-blue-400 hover:underline"
              >
                {autoGenerateCode ? '✏️ Custom Code' : '⚡ System Auto-Gen'}
              </button>
            </div>
            {autoGenerateCode ? (
              <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 text-xs font-mono text-blue-300 flex items-center justify-between">
                <span>[Auto-Generated Secure Code]</span>
                <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300 font-bold">CRYPTO-SECURE</span>
              </div>
            ) : (
              <input
                type="text"
                placeholder="e.g. FOUNDER2026"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white"
              />
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Discount %</label>
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Max Redemptions</label>
            <input
              type="number"
              value={maxUses}
              onChange={e => setMaxUses(Number(e.target.value))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase text-slate-400">Target Plan:</span>
            <select
              value={targetPlan}
              onChange={e => setTargetPlan(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white uppercase"
            >
              <option value="starter">Individual</option>
              <option value="mid">Growth (Mid-Co)</option>
              <option value="mega">Mega Enterprise</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={creating}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-xl text-xs shadow-lg shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>⚡</span> <span>{creating ? 'Generating...' : 'Generate Coupon'}</span>
          </button>
        </div>
      </div>

      {coupons.length > 0 && (
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Campaign / Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Redemptions</th>
                <th className="px-4 py-3">Target Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {coupons.map(c => (
                <tr key={c.id} className={`hover:bg-white/5 ${!c.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-sans font-bold text-white max-w-[160px] truncate">{c.name || 'Standard Promo'}</td>
                  <td className="px-4 py-3 font-bold text-cyan-300 font-mono tracking-wider">{c.code}</td>
                  <td className="px-4 py-3 text-emerald-400">{c.discount_percent}% OFF</td>
                  <td className="px-4 py-3 text-slate-300">{c.current_uses} / {c.max_uses}</td>
                  <td className="px-4 py-3 uppercase text-purple-400">{c.target_plan}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${!c.is_active ? 'bg-slate-500/20 text-slate-400' : c.current_uses >= c.max_uses ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {!c.is_active ? 'DISABLED' : c.current_uses >= c.max_uses ? 'EXPIRED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleToggleCoupon(c.id)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${c.is_active ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Purge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
