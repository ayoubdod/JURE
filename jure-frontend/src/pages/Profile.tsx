
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import TeamMemberProfile from '../components/TeamMemberProfile';
import { useNavigate, useParams } from 'react-router';
import { apiGetCabinetMember, apiGetMyCabinetMember } from '@/services/cabinet-member/api';
import { useAppTranslation } from '@/i18n';

const Profile = () => {
  const { t } = useAppTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const id = parseInt(params.id as string);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<API.CabinetMember | null>(null);

  useEffect(() => {
    setIsLoading(true);
    if(id){
      apiGetCabinetMember(id,{expand:'assigned_cases'}).then((res) => {
        setProfile(res.data);
      })
        .catch((err) => {
          navigate(-1)
        })
        .finally(() => {
          setIsLoading(false);
        });
    }else{
        apiGetMyCabinetMember({expand:'assigned_cases'}).then((res) => {
          setProfile(res.data);
        })
          .catch((err) => {
            navigate(-1)
          })
          .finally(() => {
            setIsLoading(false);
          });
    }
  }, [id]);

  if (isLoading && !profile) {
    return <div>{t.profile.loading}</div>;
  }

  return (
    <div>
      {/* Team Member Profile - Full Width with Integrated Assigned Cases */}
      <TeamMemberProfile profile={profile} onUpdateSuccess={(instance)=>{
        setProfile({
          ...profile,
          ...instance
        })
      }} />
    </div>
  );
};

export default Profile;
