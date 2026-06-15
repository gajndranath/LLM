import { useState, useEffect } from 'react';
import { superAdminApi } from '../api/auth.api';
import { toast } from 'sonner';
import { DollarSign, AlertTriangle, ShieldAlert, Mail, Activity, CheckCircle2 } from 'lucide-react';

export const FinancialDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [unpaidOrgs, setUnpaidOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, txRes, unpaidRes] = await Promise.all([
        superAdminApi.getFinancialAnalytics(),
        superAdminApi.getTransactions(page, 20),
        superAdminApi.getUnpaidOrgs()
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data.transactions);
      setTotalPages(txRes.data.totalPages);
      setUnpaidOrgs(unpaidRes.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleRemind = async (orgId: string) => {
    try {
      const toastId = toast.loading('Sending reminder email...');
      await superAdminApi.remindUnpaidOrg(orgId);
      toast.success('Reminder email sent successfully', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reminder');
    }
  };

  if (loading && !stats) return <div className="p-8 text-center text-slate-400">Loading financials...</div>;

  return (
    <div className="space-y-8">
      {/* Financial KPIs */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass rounded-3xl p-6 border border-emerald-500/20 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
            <p className="text-slate-400 font-medium mb-1">Total Revenue</p>
            <h2 className="text-4xl font-black text-white">
              {(stats.totalRevenueCents / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </h2>
          </div>
          
          <div className="glass rounded-3xl p-6 border border-blue-500/20">
            <p className="text-slate-400 font-medium mb-1 flex items-center"><Activity size={16} className="mr-2 text-blue-400" /> Successful</p>
            <h2 className="text-3xl font-bold text-white">{stats.successfulTransactions}</h2>
            <p className="text-xs text-slate-500 mt-2">Transactions captured</p>
          </div>

          <div className="glass rounded-3xl p-6 border border-amber-500/20">
            <p className="text-slate-400 font-medium mb-1 flex items-center"><AlertTriangle size={16} className="mr-2 text-amber-400" /> Pending / Abandoned</p>
            <h2 className="text-3xl font-bold text-white">{stats.pendingTransactions}</h2>
            <p className="text-xs text-slate-500 mt-2">Incomplete checkouts</p>
          </div>

          <div className="glass rounded-3xl p-6 border border-red-500/20 relative overflow-hidden bg-gradient-to-br from-red-500/10 to-transparent">
            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert size={80} /></div>
            <p className="text-slate-400 font-medium mb-1 text-red-400">Fraud Blocked</p>
            <h2 className="text-3xl font-bold text-white">{stats.fraudAttemptsBlocked}</h2>
            <p className="text-xs text-red-400/50 mt-2">Invalid signatures/replays</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction History */}
        <div className="lg:col-span-2 glass rounded-3xl border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-white text-lg">Transaction History</h2>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Organization</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Status & Security</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{tx.org_name}</p>
                      <p className="text-[10px] text-slate-500">{tx.org_email}</p>
                      <p className="text-[9px] text-slate-600 font-mono mt-1" title="Provider Order ID">{tx.provider_order_id}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-300">
                      {tx.currency} {tx.amount_cents / 100}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                      {tx.plan_code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-max ${
                          tx.status === 'captured' ? 'bg-emerald-500/20 text-emerald-400' :
                          tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.status.toUpperCase()}
                        </span>
                        {(tx.status === 'captured' && !tx.signature_verified) && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full w-max bg-red-500/20 text-red-400 flex items-center">
                            <ShieldAlert size={10} className="mr-1"/> FRAUD FLAG
                          </span>
                        )}
                        {tx.signature_verified && (
                          <span className="text-[9px] text-emerald-500/70">Verified ✓</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-slate-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex space-x-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>

        {/* Unpaid Reminders */}
        <div className="glass rounded-3xl p-6 border border-white/5 flex flex-col h-[600px]">
          <h2 className="font-bold text-white text-lg flex items-center space-x-2 mb-4">
            <AlertTriangle className="text-amber-400" size={20} />
            <span>Unpaid / Abandoned</span>
          </h2>
          <p className="text-xs text-slate-400 mb-6">Organizations that initiated an upgrade but haven't completed payment.</p>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {unpaidOrgs.map(org => (
              <div key={org.id} className="bg-black/40 border border-amber-500/20 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{org.name}</h3>
                    <p className="text-[10px] text-slate-500">{org.admin_email}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {org.amount_cents / 100} INR
                  </span>
                </div>
                
                <div className="text-xs text-slate-400 mb-3">
                  Attempted: <strong className="text-white uppercase">{org.attempted_plan}</strong>
                  <br />
                  <span className="text-[10px]">{new Date(org.attempt_date).toLocaleDateString()}</span>
                </div>

                <button 
                  onClick={() => handleRemind(org.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
                >
                  <Mail size={14} />
                  <span>Send Auto-Reminder</span>
                </button>
              </div>
            ))}
            {unpaidOrgs.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                No unpaid checkouts found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
