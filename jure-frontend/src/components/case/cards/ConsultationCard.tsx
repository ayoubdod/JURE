'use client';

import React from 'react';
import CaseWorkspaceCard from '@/components/case/CaseWorkspaceCard';

export interface ConsultationCardProps {
  caseItem: API.Case;
  onClick?: () => void;
  onEdit?: () => void;
}

const ConsultationCard: React.FC<ConsultationCardProps> = (props) => (
  <CaseWorkspaceCard {...props} />
);

export default ConsultationCard;
