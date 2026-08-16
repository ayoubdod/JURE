'use client';

import React from 'react';
import CaseWorkspaceCard from '@/components/case/CaseWorkspaceCard';

export interface LitigationCardProps {
  caseItem: API.Case;
  onClick?: () => void;
  onEdit?: () => void;
}

const LitigationCard: React.FC<LitigationCardProps> = (props) => (
  <CaseWorkspaceCard {...props} />
);

export default LitigationCard;
