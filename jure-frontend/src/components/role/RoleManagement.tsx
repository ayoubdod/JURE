import React, { useEffect, useState } from 'react';
import { Shield, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiGetCabinetMembers, apiUpdateCabinetMemberRole } from '@/services/cabinet-member/api';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { getRoleDisplayName, getRoleDescription, DEFAULT_ROLE_PERMISSIONS } from '@/utils/permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const RoleManagement: React.FC = () => {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<API.CabinetMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      const response = await apiGetCabinetMembers();
      setTeamMembers(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load team members.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: number, newRole: API.Role) => {
    // setUpdatingMemberId(memberId);
    // try {
    //   await apiUpdateCabinetMemberRole({ id: memberId, role: newRole });
    //   setTeamMembers((prev) =>
    //     prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    //   );
    //   toast({
    //     title: 'Role updated',
    //     description: `Team member role has been updated to ${getRoleDisplayName(newRole)}.`,
    //   });
    // } catch (error) {
    //   toast({
    //     title: 'Update failed',
    //     description: 'Failed to update team member role.',
    //     variant: 'destructive',
    //   });
    // } finally {
    //   setUpdatingMemberId(null);
    // }

    setUpdatingMemberId(memberId);
    await apiUpdateCabinetMemberRole({
      id: memberId,
      role: newRole,
    })
    .then((res)=>{
      setTeamMembers((prev)=>prev.map((m)=>m.id === memberId ? { ...m, ...res.data } : m));
    })
    .catch((err)=>{
      toast({
        title: 'Error',
        description: 'Failed to update team member role.',
        variant: 'destructive',
      });
    })
    .finally(()=>{
      setUpdatingMemberId(null);
    })
  };

  const roleColors: Record<API.Role, string> = {
    OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    LAWYER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ASSISTANT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    VIEWER: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  };

  const roles: API.Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER'];

  return (
    <div className="space-y-6">
      {/* Role Information Card */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-jure-600" />
            <CardTitle>Role & Permissions Overview</CardTitle>
          </div>
          <CardDescription>
            Manage what each team member can see and edit. Roles define default permissions that can be customized.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => {
              const permissions = DEFAULT_ROLE_PERMISSIONS[role];
              const memberCount = teamMembers.filter((m) => m.role === role).length;
              
              return (
                <div
                  key={role}
                  className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge className={cn('text-xs font-semibold', roleColors[role])}>
                      {getRoleDisplayName(role)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{memberCount} members</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {getRoleDescription(role)}
                  </p>
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-xs font-medium text-foreground mb-1">Permissions:</p>
                    <p className="text-xs text-muted-foreground">
                      {permissions.length} permissions enabled
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Team Members Role Assignment */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-jure-600" />
            <CardTitle>Team Member Roles</CardTitle>
          </div>
          <CardDescription>
            Assign roles to team members. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-jure-600" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed';
                const currentRole = member.role || 'VIEWER';
                
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          image={getPersonImage(member as Record<string, unknown>)}
                          firstName={member.first_name}
                          lastName={member.last_name}
                          size="md"
                          className="h-10 w-10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{fullName}</p>
                          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        </div>
                        <Badge
                          className={cn(
                            'text-xs font-semibold shrink-0',
                            roleColors[currentRole as API.Role]
                          )}
                        >
                          {getRoleDisplayName(currentRole as API.Role)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentRole}
                        onValueChange={(value) => handleRoleChange(member.id, value as API.Role)}
                        disabled={updatingMemberId === member.id}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {getRoleDisplayName(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updatingMemberId === member.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-jure-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Details */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Permission Details</CardTitle>
          <CardDescription>
            Understanding what each permission allows team members to do.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => {
              const permissions = DEFAULT_ROLE_PERMISSIONS[role];
              const grouped = permissions.reduce((acc, perm) => {
                const [resource] = perm.split('.');
                if (!acc[resource]) acc[resource] = [];
                acc[resource].push(perm);
                return acc;
              }, {} as Record<string, API.Permission[]>);

              return (
                <div key={role} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={cn('text-xs', roleColors[role])}>
                      {getRoleDisplayName(role)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {permissions.length} permissions
                    </span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(grouped).map(([resource, perms]) => (
                      <div key={resource} className="text-sm">
                        <p className="font-medium text-foreground capitalize mb-1">{resource}</p>
                        <div className="flex flex-wrap gap-1">
                          {(perms as API.Permission[]).map((perm) => {
                            const action = perm.split('.')[1];
                            return (
                              <Badge
                                key={perm}
                                variant="outline"
                                className="text-xs"
                              >
                                {action}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagement;


