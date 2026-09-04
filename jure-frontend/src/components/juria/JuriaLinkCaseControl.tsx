import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CaseLinkDropdown } from '@/components/juria/CaseLinkDropdown';
import type { JuriaProject } from '@/types/juria';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { useAppTranslation } from '@/i18n';

/** Link or change the JURE matter connected to a Juria project. */
export function JuriaLinkCaseControl({
  project,
  compact,
  align = 'start',
  showUnlink = true,
}: {
  project: JuriaProject;
  compact?: boolean;
  align?: 'start' | 'end';
  showUnlink?: boolean;
}) {
  const { t } = useAppTranslation();
  const o = t.juria.workspace.overview;
  const update = useJuriaStore((s) => s.updateProject);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const apply = async (id: number | null) => {
    setBusy(true);
    try {
      await update(project.id, { linked_case_id: id });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: o.linkFailed,
        description: getJuriaErrorMessage(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CaseLinkDropdown
        compact={compact}
        align={align}
        disabled={busy}
        label={project.linked_case_id ? t.conversations.changeCase : t.juria.linkMatter}
        onSelect={(c) => void apply(c.id)}
      />
      {showUnlink && project.linked_case_id ? (
        <Button
          type="button"
          variant="ghost"
          size={compact ? 'sm' : 'default'}
          className={compact ? 'h-8 px-2 text-xs' : undefined}
          disabled={busy}
          onClick={() => void apply(null)}
        >
          {o.unlinkCase}
        </Button>
      ) : null}
    </div>
  );
}
