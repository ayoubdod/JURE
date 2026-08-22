import axios from 'axios';
import axiosInstance from '@/utils/axiosInstance';

export type Jurisdiction = {
  id: number;
  code: string;
  name: string;
  country_code: string;
  legal_system: string;
  default_language: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
};

export function countryFlagEmoji(countryCode: string): string {
  const code = (countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

export async function apiGetJurisdictions(): Promise<Jurisdiction[]> {
  const { data } = await axios.get<Jurisdiction[]>(
    `${axiosInstance.defaults.baseURL}/jurisdictions/`,
    {
      headers: {
        'Accept-Language':
          typeof document !== 'undefined' ? document.documentElement.lang : 'en',
      },
    }
  );
  return Array.isArray(data) ? data : [];
}
