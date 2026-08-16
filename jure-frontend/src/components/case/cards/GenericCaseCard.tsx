'use client';

import React from 'react';
import CaseWorkspaceCard from '@/components/case/CaseWorkspaceCard';

export interface GenericCaseCardProps {
  caseItem: API.Case;
  onClick?: () => void;
  onEdit?: () => void;
}

const GenericCaseCard: React.FC<GenericCaseCardProps> = (props) => (
  <CaseWorkspaceCard {...props} />
);

export default GenericCaseCard;
