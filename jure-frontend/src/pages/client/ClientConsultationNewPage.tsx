import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAppTranslation } from '@/i18n';
import {
  apiCreateConsultation,
  apiUploadConsultationAttachment,
  type LegalArea,
  type PreferredFormat,
} from '@/services/consultations/api';
import { apiListPortalCases, type PortalCaseListItem } from '@/services/portal/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type FormValues = {
  subject: string;
  legalArea: LegalArea;
  description: string;
  preferredFormat: PreferredFormat;
  preferredDatetime: string;
  relatedCaseId: string;
};

const LEGAL_AREAS: LegalArea[] = [
  'BUSINESS',
  'LABOR',
  'REAL_ESTATE',
  'COMMERCIAL',
  'CORPORATE',
  'TAX',
  'IP',
  'DATA_PROTECTION',
  'OTHER',
];

const FORMATS: PreferredFormat[] = ['CHAT', 'VIDEO', 'PHONE', 'IN_PERSON'];

const ClientConsultationNewPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState<PortalCaseListItem[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const schema = yup.object({
    subject: yup.string().required(cp.form.subjectRequired).max(255),
    legalArea: yup.string().required(),
    description: yup.string().required(cp.form.descriptionRequired).min(20),
    preferredFormat: yup.string().required(),
    preferredDatetime: yup.string().default(''),
    relatedCaseId: yup.string().default(''),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      subject: '',
      legalArea: 'COMMERCIAL',
      description: '',
      preferredFormat: 'CHAT',
      preferredDatetime: '',
      relatedCaseId: '',
    },
  });

  useEffect(() => {
    apiListPortalCases()
      .then((res) => setCases(res.data))
      .catch(() => undefined);
  }, []);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await apiCreateConsultation({
        subject: values.subject,
        legalArea: values.legalArea,
        description: values.description,
        preferredFormat: values.preferredFormat,
        preferredDatetime: values.preferredDatetime,
        relatedCaseId: values.relatedCaseId ? Number(values.relatedCaseId) : null,
      });
      const id = res.data.id;
      if (files?.length) {
        for (const file of Array.from(files)) {
          await apiUploadConsultationAttachment(id, file);
        }
      }
      toast({
        title: cp.form.successTitle,
        description: cp.form.successBody.replace('{ref}', res.data.reference),
      });
      navigate(`/client/consultations/${id}`);
    } catch {
      toast({
        title: cp.errors.submitFailed,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2">
          <Link to="/client/consultations">{cp.common.back}</Link>
        </Button>
        <h1 className="font-serif text-3xl text-[#2F2450]">{cp.form.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{cp.form.subtitle}</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="space-y-2">
          <Label htmlFor="subject">{cp.form.subject}</Label>
          <Input id="subject" {...register('subject')} placeholder={cp.form.subjectPlaceholder} />
          {errors.subject && (
            <p className="text-xs text-rose-600">{errors.subject.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{cp.form.legalArea}</Label>
          <Select
            value={watch('legalArea')}
            onValueChange={(v) => setValue('legalArea', v as LegalArea)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEGAL_AREAS.map((area) => (
                <SelectItem key={area} value={area}>
                  {cp.legalAreas[area]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{cp.form.description}</Label>
          <Textarea
            id="description"
            rows={6}
            {...register('description')}
            placeholder={cp.form.descriptionPlaceholder}
          />
          {errors.description && (
            <p className="text-xs text-rose-600">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{cp.form.relatedCase}</Label>
          <Select
            value={watch('relatedCaseId') || 'none'}
            onValueChange={(v) => setValue('relatedCaseId', v === 'none' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={cp.form.noRelatedCase} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{cp.form.noRelatedCase}</SelectItem>
              {cases.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.reference} — {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{cp.form.format}</Label>
          <Select
            value={watch('preferredFormat')}
            onValueChange={(v) => setValue('preferredFormat', v as PreferredFormat)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f} value={f}>
                  {cp.formats[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredDatetime">{cp.form.availability}</Label>
          <Input
            id="preferredDatetime"
            {...register('preferredDatetime')}
            placeholder={cp.form.availabilityPlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="files">{cp.form.documents}</Label>
          <Input
            id="files"
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
          <p className="text-xs text-slate-500">{cp.form.documentsHint}</p>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#64499D] hover:bg-[#553d86] sm:w-auto"
        >
          {submitting ? cp.form.submitting : cp.form.submit}
        </Button>
      </form>
    </div>
  );
};

export default ClientConsultationNewPage;
