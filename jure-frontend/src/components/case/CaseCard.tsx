'use client';

import React from 'react';
import CaseWorkspaceCard from '@/components/case/CaseWorkspaceCard';

export interface CaseCardProps {
  caseItem: API.Case;
  onClick?: () => void;
  onEdit?: () => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ caseItem, onClick, onEdit }) => {
  if (!caseItem) return null;
  return <CaseWorkspaceCard caseItem={caseItem} onClick={onClick} onEdit={onEdit} />;
};

export default CaseCard;
