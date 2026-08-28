'use client';

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';
import CaseWorkspaceView from '@/components/case/workspace/CaseWorkspaceView';
import LitigationWorkspaceSkeleton from '@/components/case/workspace/litigation-detail/LitigationWorkspaceSkeleton';
import {
  caseTypeListPath,
  caseWorkspacePath,
  expectedTypeFromPath,
  fetchCaseBySlug,
} from '@/lib/caseRoutes';
import { getCaseType } from '@/services/case/caseType';

export default function CaseWorkspacePage() {
  const { t, tf } = useAppTranslation();
  const pw = t.cases.pageWorkspace;
  const navigate = useNavigate();
  const location = useLocation();
  const { caseSlug = '' } = useParams<{ caseSlug: string }>();
  const expectedType = expectedTypeFromPath(location.pathname);

  const [caseItem, setCaseItem] = useState<API.Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mismatch, setMismatch] = useState<API.Case | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!expectedType || !caseSlug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setMismatch(null);
    setCaseItem(null);
    void fetchCaseBySlug(expectedType, caseSlug)
      .then(({ caseItem: found, mismatch: wrongType }) => {
        if (cancelled) return;
        if (found) setCaseItem(found);
        else if (wrongType) setMismatch(wrongType);
        else setNotFound(true);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseSlug, expectedType]);

  if (!expectedType) {
    return <Navigate to="/dashboard/cases" replace />;
  }

  const sectionTitle =
    expectedType === 'CONSULTATION'
      ? t.cases.workspaces.consultation.title
      : expectedType === 'LITIGATION'
        ? t.cases.workspaces.litigation.title
        : t.cases.workspaces.administrative.title;

  const listPath = caseTypeListPath(expectedType);

  if (mismatch) {
    return <Navigate to={caseWorkspacePath(mismatch)} replace />;
  }

  if (loading) {
    if (expectedType === 'LITIGATION' || expectedType === 'ADMINISTRATIVE') {
      return <LitigationWorkspaceSkeleton />;
    }
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#64499D]" />
      </div>
    );
  }

  if (notFound || !caseItem) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          {tf(pw.notFoundTitle, { section: sectionTitle })}
        </h1>
        <p className="max-w-md text-[13px] text-slate-500">{tf(pw.notFoundBody, { section: sectionTitle })}</p>
        <Button type="button" variant="outline" onClick={() => navigate(listPath)}>
          {tf(pw.backTo, { section: sectionTitle })}
        </Button>
        <Link to="/dashboard/cases" className="text-[13px] text-[#64499D]">
          {pw.cases}
        </Link>
      </div>
    );
  }

  if (getCaseType(caseItem) !== expectedType && getCaseType(caseItem) !== 'UNKNOWN') {
    return <Navigate to={caseWorkspacePath(caseItem)} replace />;
  }

  if (caseItem.parentConsultation?.id) {
    return (
      <Navigate
        to={caseWorkspacePath({ ...caseItem.parentConsultation, caseType: 'CONSULTATION' })}
        replace
      />
    );
  }

  return <CaseWorkspaceView caseItem={caseItem} onCaseChange={setCaseItem} />;
}
