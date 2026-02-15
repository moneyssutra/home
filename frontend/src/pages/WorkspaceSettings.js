import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Users, Settings, Copy, RefreshCw, Plus, Trash2, 
  Crown, Shield, Edit3, Eye, UserPlus, Check, X,
  Building2, User, Mail, ChevronLeft
} from 'lucide-react';

const WorkspaceSettings = () => {
  const navigate = useNavigate();
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const { user } = useAuth();
  const { 
    currentWorkspace, 
    workspaces,
    pendingInvitations,
    permissions,
    loading,
    inviteMember,
    joinByCode,
    acceptInvitation,
    updateMemberRole,
    removeMember,
    regenerateInviteCode,
    createWorkspace,
    switchWorkspace,
    refreshInvitations
  } = useWorkspace();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [joinCode, setJoinCode] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState('Personal');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roleIcons = {
    owner: <Crown className="h-4 w-4 text-amber-400" />,
    admin: <Shield className="h-4 w-4 text-blue-400" />,
    editor: <Edit3 className="h-4 w-4 text-emerald-400" />,
    viewer: <Eye className="h-4 w-4 text-gray-400" />
  };

  const roleLabels = {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer'
  };

  const roleColors = {
    owner: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    editor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    viewer: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };

  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentWorkspace) return;
      
      try {
        const response = await axios.get(
          `${backendUrl}/api/workspaces/${currentWorkspace.id}/members`,
          { withCredentials: true }
        );
        setMembers(response.data);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [currentWorkspace, backendUrl]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    const result = await inviteMember(inviteEmail, inviteRole);
    if (result.success) {
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      // Refresh members list
      const response = await axios.get(
        `${backendUrl}/api/workspaces/${currentWorkspace.id}/members`,
        { withCredentials: true }
      );
      setMembers(response.data);
    } else {
      setError(result.error);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!joinCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    
    const result = await joinByCode(joinCode);
    if (result.success) {
      setSuccess(result.message);
      setJoinCode('');
      setShowJoinModal(false);
    } else {
      setError(result.error);
    }
  };

  const handleAcceptInvitation = async (memberId) => {
    const result = await acceptInvitation(memberId);
    if (result.success) {
      setSuccess(result.message);
    } else {
      setError(result.error);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setError('');
    const result = await updateMemberRole(memberId, newRole);
    if (result.success) {
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      setSuccess('Role updated successfully');
    } else {
      setError(result.error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    setError('');
    const result = await removeMember(memberId);
    if (result.success) {
      setMembers(members.filter(m => m.id !== memberId));
      setSuccess('Member removed successfully');
    } else {
      setError(result.error);
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('This will invalidate the current invite code. Continue?')) return;
    
    const result = await regenerateInviteCode();
    if (result.success) {
      setSuccess('Invite code regenerated');
    } else {
      setError(result.error);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newWorkspaceName.trim()) {
      setError('Please enter a workspace name');
      return;
    }
    
    const result = await createWorkspace(newWorkspaceName, newWorkspaceType);
    if (result.success) {
      setSuccess('Workspace created successfully');
      setNewWorkspaceName('');
      setShowCreateModal(false);
      await switchWorkspace(result.workspace.id);
    } else {
      setError(result.error);
    }
  };

  const copyInviteCode = () => {
    if (currentWorkspace?.invite_code) {
      navigator.clipboard.writeText(currentWorkspace.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (loading || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1F3B] via-[#111827] to-[#0B1F3B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/60">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3B] via-[#111827] to-[#0B1F3B] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B1F3B] to-[#111827] px-4 py-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Workspace Settings</h1>
            <p className="text-white/50 text-sm">{currentWorkspace.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 mt-4">
        {/* Messages */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm">
            {success}
          </div>
        )}

        {/* Workspace Selector */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Your Workspaces
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
              >
                Join
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> New
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => switchWorkspace(ws.id)}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors ${
                  ws.id === currentWorkspace.id 
                    ? 'bg-emerald-500/20 border border-emerald-500/30' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ws.type === 'Business' ? 'bg-blue-500/20' : 'bg-emerald-500/20'
                  }`}>
                    {ws.type === 'Business' ? (
                      <Building2 className="h-5 w-5 text-blue-400" />
                    ) : (
                      <User className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{ws.name}</p>
                    <p className="text-white/50 text-xs">{ws.type} • {ws.role}</p>
                  </div>
                </div>
                {ws.id === currentWorkspace.id && (
                  <Check className="h-5 w-5 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="bg-amber-500/10 backdrop-blur-sm rounded-2xl p-5 border border-amber-500/20">
            <h2 className="text-amber-300 font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations ({pendingInvitations.length})
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{inv.workspace_name}</p>
                    <p className="text-white/50 text-xs">
                      Invited by {inv.invited_by_name || 'Unknown'} as {inv.role}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcceptInvitation(inv.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm hover:bg-emerald-500/30"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Code Section */}
        {permissions.invite && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              Share Invite Code
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Share this code with others to let them join as viewers
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 font-mono text-xl text-white tracking-widest text-center border border-white/10">
                {currentWorkspace.invite_code || 'N/A'}
              </div>
              <button
                onClick={copyInviteCode}
                className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              >
                {copiedCode ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
              <button
                onClick={handleRegenerateCode}
                className="p-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Invite by Email */}
        {permissions.invite && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-400" />
              Invite by Email
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:outline-none"
              />
              <div className="flex gap-2">
                {['viewer', 'editor', 'admin'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setInviteRole(role)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      inviteRole === role 
                        ? roleColors[role]
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:opacity-90 transition-colors"
              >
                Send Invitation
              </button>
            </form>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            Members ({members.filter(m => m.status === 'active').length})
          </h2>
          
          <div className="space-y-3">
            {members.filter(m => m.status === 'active' || m.status === 'pending').map(member => (
              <div 
                key={member.id} 
                className={`bg-white/5 rounded-xl p-4 flex items-center justify-between ${
                  member.status === 'pending' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                    {member.user_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{member.user_name}</p>
                      {member.user_id === user?.user_id && (
                        <span className="text-xs text-white/50">(You)</span>
                      )}
                      {member.status === 'pending' && (
                        <span className="text-xs text-amber-400">(Pending)</span>
                      )}
                    </div>
                    <p className="text-white/50 text-xs">{member.user_email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 ${roleColors[member.role]}`}>
                    {roleIcons[member.role]}
                    {roleLabels[member.role]}
                  </span>
                  
                  {permissions.invite && member.role !== 'owner' && member.user_id !== user?.user_id && (
                    <div className="flex items-center gap-1">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/10 focus:outline-none"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permission Info */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
          <h3 className="text-white/70 text-sm font-medium mb-3">Role Permissions</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-white/50">
              <span className="text-amber-300">Owner:</span> Full access
            </div>
            <div className="text-white/50">
              <span className="text-blue-300">Admin:</span> Add, Edit, View
            </div>
            <div className="text-white/50">
              <span className="text-emerald-300">Editor:</span> Add, Edit, View
            </div>
            <div className="text-white/50">
              <span className="text-gray-300">Viewer:</span> View only
            </div>
          </div>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="text-white font-semibold text-lg mb-4">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="Workspace name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:outline-none"
              />
              <div className="flex gap-2">
                {['Personal', 'Business'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewWorkspaceType(type)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center gap-2 ${
                      newWorkspaceType === type 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {type === 'Business' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:opacity-90"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="text-white font-semibold text-lg mb-4">Join Workspace</h3>
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                maxLength={8}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:outline-none text-center font-mono text-xl tracking-widest"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:opacity-90"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettings;
