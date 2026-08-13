import React, { forwardRef, useImperativeHandle, useState } from 'react';
import type { ChatUser } from '@/types/chat';
import { X, Search, MessageSquare, Loader2, Users, User } from 'lucide-react';
import { apiGetAllCabinetMembers, apiGetCabinetMembers } from '@/services/cabinet-member/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { apiCreateConversation } from '@/services/conversations/api';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { useAppTranslation } from '@/i18n';

export interface NewChatModalRef {
  show: () => void;
  hide: () => void;
}

export interface NewChatModalProps {
  onCreateConversation?: (conversation:API.Conversation) => void;
  onClose?: () => void;
}

const NewChatModal = forwardRef<NewChatModalRef, NewChatModalProps>(
  ({onCreateConversation, onClose }, ref) => {
    const { t, tf } = useAppTranslation();
    const m = t.conversations.newChatModal;
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('direct');
    const [search, setSearch] = React.useState('');
    const [members, setMembers] = useState<API.CabinetMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [createConversationLoading, setCreateConversationLoading] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [groupTitle, setGroupTitle] = useState('');

    React.useEffect(()=>{
      setIsLoading(true);
      apiGetAllCabinetMembers({ expand: 'user' }).then(res=>{
        setMembers(res.data);
      }).finally(()=>{
        setIsLoading(false);
      });
    },[]);

    const show = () => {
      setSearch('');
      setActiveTab('direct');
      setSelectedMembers([]);
      setGroupTitle('');
      setSelectedMemberId(null);
      setIsOpen(true);
    };

    const hide = () => {
      setIsOpen(false);
      onClose?.();
    };

    useImperativeHandle(ref, () => ({
      show,
      hide,
    }));

    const handlePick = async (member:API.CabinetMember) => {
      setSelectedMemberId(member.id);
      setCreateConversationLoading(true);
      await apiCreateConversation({
        participants: [member.id],
        title: `${member.first_name} ${member.last_name}`,
        type:"direct"
      }).then(res=>{
        onCreateConversation?.(res.data);
        hide();
      }).finally(()=>{
        setCreateConversationLoading(false);
        setSelectedMemberId(null);
      });
    };

    const handleToggleMember = (memberId: number) => {
      setSelectedMembers(prev => 
        prev.includes(memberId) 
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      );
    };

    const handleCreateGroup = async () => {
      if (selectedMembers.length < 1) return;
      
      setCreateConversationLoading(true);
      await apiCreateConversation({
        participants: selectedMembers,
        title: groupTitle || tf(m.defaultGroupTitle, { count: selectedMembers.length }),
        type: "group"
      }).then(res=>{
        onCreateConversation?.(res.data);
        hide();
      }).finally(()=>{
        setCreateConversationLoading(false);
      });
    };

    const filtered = members
      .filter(m =>
        m.first_name.toLowerCase().includes(search.toLowerCase()) || m.last_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
      );

    return (
      <Dialog open={isOpen} onOpenChange={(isLoading || createConversationLoading) ? undefined : setIsOpen} modal>
        <DialogContent className={`sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden ${createConversationLoading ? "pointer-events-none opacity-80" : ""}`}>
          {/* Header Banner */}
          <div className="relative h-32 bg-gradient-to-r from-[#4ECDC4] via-[#64499D] to-[#FF6B6B] overflow-hidden">
            {/* Decorative Pattern Overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px'
              }}></div>
            </div>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
              onClick={hide}
              disabled={createConversationLoading || isLoading}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Header Content */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    {createConversationLoading ? m.creatingTitle : m.title}
                  </DialogTitle>
                  <p className="text-white/90 mt-1 text-sm">
                    {m.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center">{t.common.loading}</div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="direct" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {m.tabDirect}
                </TabsTrigger>
                <TabsTrigger value="group" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {m.tabGroup}
                </TabsTrigger>
              </TabsList>

              {/* Direct Conversation Tab */}
              <TabsContent value="direct" className="mt-4">
                <div className="relative mb-3">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full ps-9"
                    placeholder={m.searchTeammates}
                    disabled={createConversationLoading}
                  />
                </div>

                <ScrollArea className="max-h-72">
                  <div className="divide-y">
                    {filtered.length === 0 && (
                      <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{m.noTeammates}</div>
                    )}
                    {filtered.map(member => (
                      <button
                        key={member.id}
                        onClick={() => handlePick(member)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 disabled:opacity-60 flex items-center gap-3"
                        disabled={createConversationLoading}
                      >
                        <UserAvatar
                          image={getPersonImage(member as Record<string, unknown>)}
                          firstName={member.first_name}
                          lastName={member.last_name}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{member.first_name} {member.last_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                        </div>
                        {createConversationLoading && selectedMemberId === member.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-purple-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Group Chat Tab */}
              <TabsContent value="group" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <Input
                      value={groupTitle}
                      onChange={(e) => setGroupTitle(e.target.value)}
                      className="w-full"
                      placeholder={m.groupNamePlaceholder}
                      disabled={createConversationLoading}
                    />
                  </div>

                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full ps-9"
                      placeholder={m.searchTeammates}
                      disabled={createConversationLoading}
                    />
                  </div>

                  <ScrollArea className="max-h-60">
                    <div className="divide-y">
                      {filtered.length === 0 && (
                        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{m.noTeammates}</div>
                      )}
                      {filtered.map(member => {
                        const isSelected = selectedMembers.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                            htmlFor={`member-${member.id}`}
                          >
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleToggleMember(member.id)}
                              disabled={createConversationLoading}
                              className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            />
                            <UserAvatar
                              image={getPersonImage(member as Record<string, unknown>)}
                              firstName={member.first_name}
                              lastName={member.last_name}
                              size="sm"
                              className="shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{member.first_name} {member.last_name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {selectedMembers.length > 0 && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedMembers.length === 1
                        ? m.memberSelectedOne
                        : tf(m.membersSelected, { count: selectedMembers.length })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={hide} disabled={createConversationLoading}>
                  {t.common.cancel}
                </Button>
                {activeTab === 'group' && (
                  <Button 
                    onClick={handleCreateGroup} 
                    disabled={createConversationLoading || selectedMembers.length < 1}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {createConversationLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                        {m.creating}
                      </>
                    ) : (
                      m.createGroup
                    )}
                  </Button>
                )}
              </DialogFooter>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

NewChatModal.displayName = 'NewChatModal';

export default NewChatModal;
