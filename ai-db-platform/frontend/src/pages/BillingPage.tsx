import { useState, useEffect } from 'react';
import { Zap, Star, Infinity as InfinityIcon, CheckCircle2, Loader2, Calendar, FileText } from 'lucide-react';
import { adminApi } from '../api/auth.api';
import { toast } from 'sonner';

type Plan = string;

// Dynamic plans will be fetched from backend

const BillingPage = () => {
  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { api } = await import('../api/axiosInstance');
        
        // Fetch billing info
        const billingRes = await adminApi.getBilling();
        setBillingInfo(billingRes.data);

        // Fetch dynamic plans
        const plansRes = await api.get('/billing/plans');
        setDynamicPlans(plansRes.data.data);

      } catch (err: any) {
        toast.error(err.message || 'Failed to load billing info');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpgrade = async (planId: Plan) => {
    try {
      const { api } = await import('../api/axiosInstance'); // Get base axios instance
      
      const res = await api.post('/billing/create-order', { plan: planId });
      const { orderId, amount, currency, keyId } = res.data.data;

      const options = {
        key: keyId,
        amount: amount * 100,
        currency: currency,
        name: "AI Database Architect",
        description: `Upgrade to ${planId.toUpperCase()} Plan`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const { api } = await import('../api/axiosInstance');
            await api.post('/billing/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success("Payment Verified! Plan Upgraded.");
            setTimeout(() => window.location.reload(), 2000);
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Verification failed. Please contact support.');
          }
        },
        prefill: {
          name: billingInfo?.organization?.name || "Organization",
        },
        theme: {
          color: "#3B82F6"
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (resp: any) {
        toast.error(`Payment Failed: ${resp.error.description}`);
      });
      rzp1.open();

    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to initiate checkout');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return toast.error('Please enter a coupon code');
    setApplyingCoupon(true);
    try {
      const { api } = await import('../api/axiosInstance');
      const res = await api.post('/billing/apply-coupon', { code: couponCode });
      toast.success(res.data.message || 'Coupon applied successfully!');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!window.confirm("Are you sure you want to cancel your plan? You will be downgraded to the FREE plan immediately.")) return;
    try {
      setLoading(true);
      await adminApi.cancelPlan();
      toast.success("Plan cancelled successfully.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to cancel plan');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  const currentPlan = billingInfo?.organization?.plan || 'free';
  const nextBillingDate = billingInfo?.nextBillingDate ? new Date(billingInfo.nextBillingDate).toLocaleDateString() : null;
  const transactions = billingInfo?.transactions || [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Billing & Subscriptions</h1>
          <p className="text-slate-400 text-sm mt-1">Manage enterprise tier, credits, and active subscription</p>
        </div>
      </div>

      {/* 7-Day Trial & Coupon Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border border-white/5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                🎁
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">7-Day Free Enterprise Trial</h3>
                <p className="text-xs text-slate-400">All new organizations get full access to AI Architect & 5 DB connections.</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase">Active Trial Mode</span>
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white mb-2">🎟️ Have a Promo / God-Mode Coupon?</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. ATLAS_FOUNDER_LIFETIME"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={applyingCoupon}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition-all"
            >
              {applyingCoupon ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Subscription Details */}
      <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="flex items-start space-x-4">
          <div className={`p-4 rounded-2xl ${currentPlan === 'free' ? 'bg-slate-500/20 text-slate-400' : 'bg-blue-500/20 text-blue-400'}`}>
            <Zap size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Status: <span className="uppercase text-emerald-400">{currentPlan === 'free' ? '7-Day Free Trial' : currentPlan}</span>
            </h3>
            <p className="text-slate-400 text-sm max-w-md">
              {currentPlan === 'free' 
                ? "You are on the 7-Day Full-Access Enterprise Trial. After 7 days, select an Individual, Growth, or Mega plan to continue using ATLAS." 
                : "Your enterprise plan is active with verified subscription."}
            </p>
            {nextBillingDate && (
              <div className="mt-4 flex items-center space-x-2 text-sm text-slate-300 bg-white/5 w-max px-3 py-1.5 rounded-lg border border-white/5">
                <Calendar size={14} className="text-emerald-400" />
                <span>Next Billing Date: <strong className="text-white">{nextBillingDate}</strong></span>
              </div>
            )}
          </div>
        </div>
        
        {currentPlan !== 'free' && (
          <div className="mt-6 md:mt-0">
            <button 
              onClick={handleCancelPlan}
              className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dynamicPlans.map((plan: any) => {
          const isCurrent = currentPlan === plan.id;
          
          // Map icons and colors dynamically based on plan id
          let Icon = Zap;
          let colorClass = 'from-slate-500 to-slate-600';
          if (plan.id === 'pro') {
            Icon = Star;
            colorClass = 'from-blue-500 to-blue-700';
          } else if (plan.id === 'mega') {
            Icon = InfinityIcon;
            colorClass = 'from-purple-500 to-indigo-700';
          }
          
          const priceDisplay = plan.price_cents === 0 ? '₹0' : `₹${plan.price_cents / 100}/mo`;

          return (
            <div
              key={plan.id}
              className={`glass rounded-3xl p-8 relative overflow-hidden transition-all duration-300 ${
                isCurrent ? 'ring-2 ring-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02]' : 'border border-white/5 hover:border-white/10'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-emerald-400" />
              )}
              
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  {isCurrent && <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Current Plan</span>}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-3xl font-black text-white">{priceDisplay}</p>
                <p className="text-slate-400 text-sm mt-1">{plan.description}</p>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature: string, i: number) => (
                  <div key={i} className="flex items-start space-x-2">
                    <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent}
                className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                  isCurrent
                    ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/25 cursor-pointer'
                }`}
              >
                {isCurrent ? 'Current Active Tier' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment History Logistics */}
      {transactions.length > 0 && (
        <div className="glass rounded-3xl border border-white/5 overflow-hidden mt-12">
          <div className="p-6 border-b border-white/5 flex items-center space-x-3">
            <FileText size={20} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Payment Logistics & History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Receipt ID</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] text-slate-500">{tx.provider_order_id}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="uppercase text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                        {tx.plan_code || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-300">
                      {tx.currency} {tx.amount_cents / 100}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`capitalize text-xs font-bold px-2 py-1 rounded-full ${
                        tx.status === 'captured' ? 'bg-emerald-500/20 text-emerald-400' : 
                        tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        tx.status === 'refunded' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status} {tx.status === 'captured' && tx.signature_verified ? '✓' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
