'use client';

import React from 'react';
import CaseWorkspaceCard from '@/components/case/CaseWorkspaceCard';

export interface AdministrativeDutyCardProps {
  caseItem: API.Case;
  onClick?: () => void;
  onEdit?: () => void;
}

const AdministrativeDutyCard: React.FC<AdministrativeDutyCardProps> = (props) => (
  <CaseWorkspaceCard {...props} />
);

export default AdministrativeDutyCard;
