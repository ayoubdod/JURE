'use client';

import React from 'react';
import ConsultationCard from './cards/ConsultationCard';
import LitigationCard from './cards/LitigationCard';
import AdministrativeDutyCard from './cards/AdministrativeDutyCard';
import GenericCaseCard from './cards/GenericCaseCard';

export interface CaseCardProps {
  caseItem: API.Case;
  onClick?: () => void;
}

/**
 * Entry component for case cards. Delegates to the correct sub-component
 * based on case.caseType (or case.case_type for backend compatibility).
 */
const CaseCard: React.FC<CaseCardProps> = ({ caseItem, onClick }) => {
  if (!caseItem) return null;

  const caseType = caseItem.caseType ?? caseItem.case_type;

  switch (caseType) {
    case 'CONSULTATION':
      return <ConsultationCard caseItem={caseItem} onClick={onClick} />;
    case 'LITIGATION':
      return <LitigationCard caseItem={caseItem} onClick={onClick} />;
    case 'ADMINISTRATIVE_DUTY':
    case 'ADMINISTRATIVE':
      return <AdministrativeDutyCard caseItem={caseItem} onClick={onClick} />;
    default:
      return <GenericCaseCard caseItem={caseItem} onClick={onClick} />;
  }
};

export default CaseCard;
