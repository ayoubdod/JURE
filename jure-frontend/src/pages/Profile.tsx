import { useEffect, useState } from 'react';
import TeamMemberProfile, { ProfileWorkspaceSkeleton } from '@/components/team/TeamMemberProfile';
import { useNavigate, useParams } from 'react-router';
import { apiGetCabinetMember, apiGetMyCabinetMember } from '@/services/cabinet-member/api';

const Profile = () => {
  const params = useParams();
  const navigate = useNavigate();
  const id = parseInt(params.id as string);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<API.CabinetMember | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const request = id
      ? apiGetCabinetMember(id, { expand: 'assigned_cases' })
      : apiGetMyCabinetMember({ expand: 'assigned_cases' });

    request
      .then((res) => {
        setProfile(res.data);
      })
      .catch(() => {
        navigate(-1);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, navigate]);

  if (isLoading && !profile) {
    return <ProfileWorkspaceSkeleton />;
  }

  if (!profile) {
    return null;
  }

  return (
    <TeamMemberProfile
      profile={profile}
      onUpdateSuccess={(instance) => {
        setProfile({
          ...profile,
          ...instance,
        });
      }}
    />
  );
};

export default Profile;
