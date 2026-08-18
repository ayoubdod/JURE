import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { Check, Loader2, MessageSquare, Search, User, Users } from 'lucide-react';
import { apiGetAllCabinetMembers } from '@/services/cabinet-member/api';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { apiCreateConversation } from '@/services/conversations/api';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import {
  CREATE_CANCEL_CLASS,
  CREATE_FOOTER_CLASS,
  CREATE_INPUT_CLASS,
  CREATE_SUBMIT_CLASS,
  CreateFormDialog,
  CreateFormField,
  CreateFormSection,
} from '@/components/forms/CreateFormShell';

export interface NewChatModalRef {
  show: () => void;
  hide: () => void;
}

export interface NewChatModalProps {
  onCreateConversation?: (conversation: API.Conversation) => void;
  onClose?: () => void;
}

const NewChatModal = forwardRef<NewChatModalRef, NewChatModalProps>(
  ({ onCreateConversation, onClose }, ref) => {
    const { t, tf } = useAppTranslation();
    const copy = t.conversations.newChatModal;
    const formId = useId();
    const searchRef = useRef<HTMLInputElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
    const [search, setSearch] = useState('');
    const [members, setMembers] = useState<API.CabinetMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [groupTitle, setGroupTitle] = useState('');

    const isBusy = submitPhase !== 'idle';

    useEffect(() => {
      setIsLoading(true);
      apiGetAllCabinetMembers({ expand: 'user' })
        .then((res) => {
          setMembers(res.data);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, []);

    const resetLocalState = () => {
      setSearch('');
      setActiveTab('direct');
      setSelectedMembers([]);
      setGroupTitle('');
      setSelectedMemberId(null);
      setSubmitPhase('idle');
    };

    const show = () => {
      resetLocalState();
      setIsOpen(true);
    };

    const hide = () => {
      if (isBusy) return;
      setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({ show, hide }));

    const handlePick = async (member: API.CabinetMember) => {
      if (isBusy) return;
      setSelectedMemberId(member.id);
      setSubmitPhase('loading');
      try {
        const res = await apiCreateConversation({
          participants: [member.id],
          title: `${member.first_name} ${member.last_name}`,
          type: 'direct',
        });
        setSubmitPhase('success');
        onCreateConversation?.(res.data);
        setIsOpen(false);
        setSubmitPhase('idle');
      } catch {
        setSubmitPhase('idle');
        setSelectedMemberId(null);
      }
    };

    const handleToggleMember = (memberId: number) => {
      if (isBusy) return;
      setSelectedMembers((prev) =>
        prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
      );
    };

    const handleCreateGroup = async () => {
      if (selectedMembers.length < 1 || isBusy) return;
      setSubmitPhase('loading');
      try {
        const res = await apiCreateConversation({
          participants: selectedMembers,
          title: groupTitle || tf(copy.defaultGroupTitle, { count: selectedMembers.length }),
          type: 'group',
        });
        setSubmitPhase('success');
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        onCreateConversation?.(res.data);
        setIsOpen(false);
        setSubmitPhase('idle');
      } catch {
        setSubmitPhase('idle');
      }
    };

    const filtered = members.filter((member) => {
      const q = search.toLowerCase();
      return (
        member.first_name.toLowerCase().includes(q) ||
        member.last_name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q)
      );
    });

    const memberRowClass = (selected: boolean) =>
      cn(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-all duration-200',
        selected
          ? 'border-[#64499D]/40 bg-[#F7F4FF] shadow-sm dark:border-[#8B6FD1]/40 dark:bg-[#64499D]/15'
          : 'border-transparent hover:border-[#64499D]/25 hover:bg-[#F7F4FF] dark:hover:border-[#8B6FD1]/30 dark:hover:bg-[#24183F]/50'
      );

    return (
      <CreateFormDialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) onClose?.();
        }}
        isBusy={isBusy}
        formId={formId}
        title={isBusy && submitPhase === 'loading' ? copy.creatingTitle : copy.title}
        description={copy.subtitle}
        icon={MessageSquare}
        closeLabel={t.common.close}
        onClose={hide}
        onOpenAutoFocus={() => searchRef.current?.focus()}
        contentClassName="md:h-[min(86vh,680px)] md:w-[min(90vw,560px)] md:max-w-[560px]"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7">
            <div className="space-y-6">
              <CreateFormSection index="01" title={copy.sectionType}>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'direct' as const, label: copy.tabDirect, icon: User },
                      { id: 'group' as const, label: copy.tabGroup, icon: Users },
                    ]
                  ).map((tab) => {
                    const selected = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-start transition-all duration-200',
                          selected
                            ? 'border-[#64499D]/40 bg-[#F7F4FF] shadow-sm dark:border-[#8B6FD1]/40 dark:bg-[#64499D]/15'
                            : 'border-slate-200 bg-white hover:border-[#64499D]/30 hover:bg-[#F7F4FF] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-[#8B6FD1]/40 dark:hover:bg-[#24183F]/50'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            selected
                              ? 'bg-white text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-zinc-900 dark:text-[#CFC2FF]'
                              : 'bg-slate-50 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400'
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="text-[13.5px] font-semibold text-slate-900 dark:text-zinc-100">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CreateFormSection>

              {activeTab === 'group' && (
                <CreateFormSection index="02" title={copy.groupName}>
                  <CreateFormField id={`${formId}-group-name`} label={copy.groupName}>
                    <Input
                      id={`${formId}-group-name`}
                      value={groupTitle}
                      onChange={(e) => setGroupTitle(e.target.value)}
                      placeholder={copy.groupNamePlaceholder}
                      className={CREATE_INPUT_CLASS}
                      disabled={isBusy}
                    />
                  </CreateFormField>
                </CreateFormSection>
              )}

              <CreateFormSection index={activeTab === 'group' ? '03' : '02'} title={copy.sectionPeople}>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      ref={searchRef}
                      id={`${formId}-search`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={cn(CREATE_INPUT_CLASS, 'ps-9')}
                      placeholder={copy.searchTeammates}
                      disabled={isBusy}
                    />
                  </div>

                  <div className="max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-[#64499D]" />
                        {t.common.loading}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="py-10 text-center text-[13px] text-slate-500 dark:text-zinc-400">
                        {copy.noTeammates}
                      </div>
                    ) : (
                      <div className="space-y-1 p-1.5">
                        {filtered.map((member) => {
                          const selected =
                            activeTab === 'direct'
                              ? selectedMemberId === member.id
                              : selectedMembers.includes(member.id);

                          if (activeTab === 'direct') {
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => handlePick(member)}
                                disabled={isBusy}
                                className={memberRowClass(selected)}
                              >
                                <UserAvatar
                                  image={getPersonImage(member as Record<string, unknown>)}
                                  firstName={member.first_name}
                                  lastName={member.last_name}
                                  size="sm"
                                  className="shrink-0"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13.5px] font-medium text-slate-900 dark:text-zinc-100">
                                    {member.first_name} {member.last_name}
                                  </span>
                                  <span className="block truncate text-[12px] text-slate-500 dark:text-zinc-400">
                                    {member.email}
                                  </span>
                                </span>
                                {isBusy && selectedMemberId === member.id ? (
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#64499D]" />
                                ) : null}
                              </button>
                            );
                          }

                          return (
                            <label
                              key={member.id}
                              htmlFor={`${formId}-member-${member.id}`}
                              className={cn(memberRowClass(selected), 'cursor-pointer')}
                            >
                              <Checkbox
                                id={`${formId}-member-${member.id}`}
                                checked={selected}
                                onCheckedChange={() => handleToggleMember(member.id)}
                                disabled={isBusy}
                                className="data-[state=checked]:border-[#64499D] data-[state=checked]:bg-[#64499D]"
                              />
                              <UserAvatar
                                image={getPersonImage(member as Record<string, unknown>)}
                                firstName={member.first_name}
                                lastName={member.last_name}
                                size="sm"
                                className="shrink-0"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-medium text-slate-900 dark:text-zinc-100">
                                  {member.first_name} {member.last_name}
                                </span>
                                <span className="block truncate text-[12px] text-slate-500 dark:text-zinc-400">
                                  {member.email}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {activeTab === 'group' && selectedMembers.length > 0 ? (
                    <p className="text-[12px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
                      {selectedMembers.length === 1
                        ? copy.memberSelectedOne
                        : tf(copy.membersSelected, { count: selectedMembers.length })}
                    </p>
                  ) : null}
                </div>
              </CreateFormSection>
            </div>
          </div>

          <DialogFooter className={CREATE_FOOTER_CLASS}>
            <Button type="button" variant="outline" onClick={hide} disabled={isBusy} className={CREATE_CANCEL_CLASS}>
              {t.common.cancel}
            </Button>
            {activeTab === 'group' ? (
              <Button
                type="button"
                onClick={handleCreateGroup}
                disabled={isBusy || selectedMembers.length < 1}
                className={CREATE_SUBMIT_CLASS}
              >
                {submitPhase === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {copy.creating}
                  </>
                ) : submitPhase === 'success' ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {copy.createGroup}
                  </>
                ) : (
                  copy.createGroup
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      </CreateFormDialog>
    );
  }
);

NewChatModal.displayName = 'NewChatModal';

export default NewChatModal;
