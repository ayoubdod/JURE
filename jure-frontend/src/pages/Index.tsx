
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TeamMemberProfile from '../components/TeamMemberProfile';
import CasesTable from '../components/CasesTable';
import DocumentsSection from '../components/DocumentsSection';

const Index = () => {
  const [activeTab, setActiveTab] = useState('team');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content with proper margins for sidebar */}
      <div className="flex-1 flex flex-col lg:ml-16">
        <Header />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Team Member Profile */}
            {/* <div className="lg:col-span-1">
              <TeamMemberProfile />
            </div> */}
            
            {/* Affairs and Documents */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              <CasesTable cases={[]} />
              <DocumentsSection documents={[]} onDeleteSuccess={() => {}} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
