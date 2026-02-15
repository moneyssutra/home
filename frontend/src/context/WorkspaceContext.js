import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    view: true,
    add: false,
    edit: false,
    delete: false,
    invite: false
  });

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/workspaces`, {
        withCredentials: true
      });
      setWorkspaces(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      return [];
    }
  }, [backendUrl]);

  const fetchCurrentWorkspace = useCallback(async (workspaceId = null) => {
    try {
      const url = workspaceId 
        ? `${backendUrl}/api/workspaces/current?workspace_id=${workspaceId}`
        : `${backendUrl}/api/workspaces/current`;
      
      const response = await axios.get(url, { withCredentials: true });
      setCurrentWorkspace(response.data);
      setPermissions(response.data.permissions || {
        view: true, add: false, edit: false, delete: false, invite: false
      });
      
      // Store in localStorage for persistence
      if (response.data?.id) {
        localStorage.setItem('currentWorkspaceId', response.data.id);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching current workspace:', error);
      return null;
    }
  }, [backendUrl]);

  const fetchPendingInvitations = useCallback(async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/workspaces/invitations/pending`, {
        withCredentials: true
      });
      setPendingInvitations(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }
  }, [backendUrl]);

  const switchWorkspace = async (workspaceId) => {
    const ws = await fetchCurrentWorkspace(workspaceId);
    if (ws) {
      localStorage.setItem('currentWorkspaceId', workspaceId);
    }
    return ws;
  };

  const createWorkspace = async (name, type = 'Personal') => {
    try {
      const response = await axios.post(`${backendUrl}/api/workspaces`, {
        name,
        type
      }, { withCredentials: true });
      
      await fetchWorkspaces();
      return { success: true, workspace: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to create workspace'
      };
    }
  };

  const inviteMember = async (email, role = 'viewer') => {
    if (!currentWorkspace) return { success: false, error: 'No workspace selected' };
    
    try {
      const response = await axios.post(
        `${backendUrl}/api/workspaces/${currentWorkspace.id}/invite`,
        { email, role },
        { withCredentials: true }
      );
      return { success: true, ...response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to send invitation'
      };
    }
  };

  const joinByCode = async (inviteCode) => {
    try {
      const response = await axios.post(`${backendUrl}/api/workspaces/join`, {
        invite_code: inviteCode
      }, { withCredentials: true });
      
      await fetchWorkspaces();
      await fetchCurrentWorkspace(response.data.workspace_id);
      
      return { success: true, ...response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to join workspace'
      };
    }
  };

  const acceptInvitation = async (memberId) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/workspaces/accept/${memberId}`,
        {},
        { withCredentials: true }
      );
      
      await fetchWorkspaces();
      await fetchPendingInvitations();
      
      return { success: true, ...response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to accept invitation'
      };
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    if (!currentWorkspace) return { success: false, error: 'No workspace selected' };
    
    try {
      const response = await axios.put(
        `${backendUrl}/api/workspaces/${currentWorkspace.id}/members/${memberId}/role?new_role=${newRole}`,
        {},
        { withCredentials: true }
      );
      return { success: true, ...response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update role'
      };
    }
  };

  const removeMember = async (memberId) => {
    if (!currentWorkspace) return { success: false, error: 'No workspace selected' };
    
    try {
      const response = await axios.delete(
        `${backendUrl}/api/workspaces/${currentWorkspace.id}/members/${memberId}`,
        { withCredentials: true }
      );
      return { success: true, ...response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to remove member'
      };
    }
  };

  const regenerateInviteCode = async () => {
    if (!currentWorkspace) return { success: false, error: 'No workspace selected' };
    
    try {
      const response = await axios.put(
        `${backendUrl}/api/workspaces/${currentWorkspace.id}/regenerate-code`,
        {},
        { withCredentials: true }
      );
      
      setCurrentWorkspace(prev => ({
        ...prev,
        invite_code: response.data.invite_code
      }));
      
      return { success: true, invite_code: response.data.invite_code };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to regenerate code'
      };
    }
  };

  // Initialize workspace on mount (only when authenticated)
  useEffect(() => {
    const initWorkspace = async () => {
      if (!isAuthenticated || authLoading) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      
      await fetchWorkspaces();
      await fetchCurrentWorkspace(savedWorkspaceId);
      await fetchPendingInvitations();
      
      setLoading(false);
    };
    
    initWorkspace();
  }, [isAuthenticated, authLoading, fetchWorkspaces, fetchCurrentWorkspace, fetchPendingInvitations]);

  const value = {
    currentWorkspace,
    workspaces,
    pendingInvitations,
    permissions,
    loading,
    switchWorkspace,
    createWorkspace,
    inviteMember,
    joinByCode,
    acceptInvitation,
    updateMemberRole,
    removeMember,
    regenerateInviteCode,
    refreshWorkspaces: fetchWorkspaces,
    refreshInvitations: fetchPendingInvitations,
    canAdd: permissions.add,
    canEdit: permissions.edit,
    canDelete: permissions.delete,
    canInvite: permissions.invite
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export default WorkspaceContext;
