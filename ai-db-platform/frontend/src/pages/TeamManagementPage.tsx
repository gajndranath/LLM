import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Mail, Shield, Trash2, ToggleLeft, ToggleRight,
  Loader2, XCircle, Clock, CheckCircle2, ChevronDown, RefreshCw
} from 'lucide-react';
import { adminApi } from '../api/auth.api';
import { toast } from 'sonner';

const ROLES = ['ANALYST', 'VIEWER', 'DISPATCHER', 'DRIVER'] as const;
type StaffRole = typeof ROLES[number];

const ROLE_COLORS: Record<string, string> = {
  ANALYST:    'bg-blue-500/20 text-blue-400',
  VIEWER:     'bg-slate-500/20 text-slate-400',
  DISPATCHER: 'bg-purple-500/20 text-purple-400',
  DRIVER:     'bg-amber-500/20 text-amber-400',
  ADMIN:      'bg-emerald-500/20 text-emerald-400',
};

interface Staff { id: string; name: string; email: string; role: string; is_active: boolean; last_login_at: string | null; created_at: string; invited_by_name: string | null; }
interface PendingInvite { id: string; email: string; name: string | null; role: string; expires_at: string; created_at: string; }

const TeamManagementPage = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('ANALYST');
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await adminApi.listStaff();
      setStaff(res.data?.staff || []);
      setPendingInvites(res.data?.pendingInvites || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff(); 
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await adminApi.inviteStaff({ email: inviteEmail, role: inviteRole, name: inviteName || undefined });
      toast.success(`Invite sent to ${inviteEmail}!`);
      setShowInviteModal(false);
      setInviteEmail(''); setInviteName(''); setInviteRole('ANALYST');
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (staffId: string, newRole: string) => {
    try {
      await adminApi.updateRole(staffId, newRole);
      toast.success('Role updated');
      setStaff(prev => prev.map(s => s.id === staffId ? { ...s, role: newRole } : s));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (member: Staff) => {
    try {
      await adminApi.toggleStatus(member.id, !member.is_active);
      toast.success(member.is_active ? 'Staff deactivated' : 'Staff activated');
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: !s.is_active } : s));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleRemove = async (member: Staff) => {
    if (!confirm(`Remove ${member.name} from your team? This action cannot be undone.`)) return;
    try {
      await adminApi.removeStaff(member.id);
      toast.success(`${member.name} removed from team`);
      setStaff(prev => prev.filter(s => s.id !== member.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove staff');
    }
  };

  const handleCancelInvite = async (invite: PendingInvite) => {
    try {
      await adminApi.cancelInvite(invite.id);
      toast.success('Invite cancelled');
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel invite');
    }
  };

  const handleResendInvite = async (invite: PendingInvite) => {
    setResendingId(invite.id);
    try {
      await adminApi.resendInvite(invite.id);
      toast.success(`Invite resent to ${invite.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend invite');
    } finally {
      setResendingId(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Users size={28} className="text-blue-400" />
            <span>Team Management</span>
          </h1>
          <p className="text-slate-400 mt-1">{staff.length} members · {pendingInvites.length} pending invites</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          <UserPlus size={18} />
          <span>Invite Staff</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-400" size={36} />
        </div>
      ) : (
        <>
          {/* Active Staff Table */}
          <div className="glass rounded-3xl overflow-hidden border border-white/5">
            <div className="p-6 border-b border-white/5">
              <h2 className="font-bold text-white flex items-center space-x-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Active Team Members</span>
                <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{staff.length}</span>
              </h2>
            </div>

            {staff.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={40} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">No staff members yet. Invite your first team member!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {staff.map((member) => (
                  <div key={member.id} className={`flex items-center p-5 space-x-4 transition-colors hover:bg-white/2 ${!member.is_active ? 'opacity-50' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {member.name[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{member.name}</p>
                      <p className="text-slate-500 text-xs truncate">{member.email}</p>
                      <p className="text-slate-600 text-[10px] mt-0.5">Last login: {formatDate(member.last_login_at)}</p>
                    </div>

                    {/* Role selector */}
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className={`appearance-none text-xs font-bold px-3 py-1.5 rounded-full pr-6 cursor-pointer border-0 outline-none bg-transparent ${ROLE_COLORS[member.role] || 'text-slate-400 bg-slate-500/20'}`}
                      >
                        {ROLES.map(r => <option key={r} value={r} className="bg-slate-800 text-white">{r}</option>)}
                      </select>
                      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(member)}
                        title={member.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-xl transition-colors ${member.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-white/5'}`}
                      >
                        {member.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => handleRemove(member)}
                        title="Remove from team"
                        className="p-2 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div className="glass rounded-3xl overflow-hidden border border-white/5">
              <div className="p-6 border-b border-white/5">
                <h2 className="font-bold text-white flex items-center space-x-2">
                  <Clock size={16} className="text-amber-400" />
                  <span>Pending Invites</span>
                  <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{pendingInvites.length}</span>
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center p-5 space-x-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Mail size={16} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{invite.email}</p>
                      {invite.name && <p className="text-slate-500 text-xs">{invite.name}</p>}
                      <p className="text-slate-600 text-[10px] mt-0.5">Expires: {formatDate(invite.expires_at)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[invite.role] || ''}`}>{invite.role}</span>
                    <button onClick={() => handleResendInvite(invite)} disabled={resendingId === invite.id} title="Resend Invite" className="p-2 rounded-xl text-slate-500 hover:bg-blue-500/10 hover:text-blue-400 transition-colors disabled:opacity-50">
                      <RefreshCw size={16} className={resendingId === invite.id ? "animate-spin text-blue-400" : ""} />
                    </button>
                    <button onClick={() => handleCancelInvite(invite)} title="Cancel Invite" className="p-2 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass w-full max-w-md p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <UserPlus size={20} className="text-blue-400" />
                <span>Invite Staff Member</span>
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required
                    className="w-full bg-black/20 border border-white/5 text-white pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 text-sm"
                    placeholder="staff@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name (Optional)</label>
                <input
                  type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-black/20 border border-white/5 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 text-sm"
                  placeholder="Staff member's name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r} type="button" onClick={() => setInviteRole(r)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${inviteRole === r ? 'border-blue-500/60 bg-blue-500/10 text-blue-400' : 'border-white/5 bg-black/20 text-slate-400 hover:border-white/10'}`}
                    >
                      <Shield size={12} className="inline mr-1" />
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 py-3 rounded-xl text-slate-400 hover:bg-white/5 border border-white/5 transition-all text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={inviting} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 text-sm">
                  {inviting ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={14} /><span>Send Invite</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagementPage;
