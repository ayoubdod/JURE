import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, User, Scale, Clock, FileUp, X } from 'lucide-react';
import { useAppTranslation } from '@/i18n';

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateCaseDialog = ({ open, onOpenChange }: CreateCaseDialogProps) => {
  const { t, tf } = useAppTranslation();
  const modal = t.cases.modal;
  const d = modal.dialog;
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    caseType: '',
    priority: '',
    status: 'active',
    description: '',
    estimatedHours: ''
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: modal.toasts.createdTitle,
      description: tf(modal.toasts.createdDescription, { title: formData.title }),
    });
    
    setFormData({
      title: '',
      client: '',
      caseType: '',
      priority: '',
      status: 'active',
      description: '',
      estimatedHours: ''
    });
    setDocuments([]);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setDocuments(prev => [...prev, ...newFiles]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6 border-b border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                {modal.createTitle}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400 mt-1">
                {modal.createDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <FileText className="w-4 h-4 text-purple-600" />
              {d.caseInformation}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1">
                  {d.caseTitle} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder={d.caseTitlePlaceholder}
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">{d.caseDescription}</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    placeholder={d.caseDescriptionPlaceholder}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <User className="w-4 h-4 text-purple-600" />
              {d.clientInformation}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium flex items-center gap-1">
                {d.client} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => setFormData({...formData, client: e.target.value})}
                  placeholder={d.clientPlaceholder}
                  required
                  className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <Scale className="w-4 h-4 text-purple-600" />
              {modal.sections.caseDetails}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseType" className="text-sm font-medium">{d.caseType}</Label>
                <Select value={formData.caseType} onValueChange={(value) => setFormData({...formData, caseType: value})}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                    <SelectValue placeholder={d.selectCaseType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">{d.caseTypes.civil}</SelectItem>
                    <SelectItem value="criminal">{d.caseTypes.criminal}</SelectItem>
                    <SelectItem value="corporate">{d.caseTypes.corporate}</SelectItem>
                    <SelectItem value="family">{d.caseTypes.family}</SelectItem>
                    <SelectItem value="real-estate">{d.caseTypes.realEstate}</SelectItem>
                    <SelectItem value="intellectual">{d.caseTypes.intellectual}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium">{d.priority}</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                    <SelectValue placeholder={d.selectPriority} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {d.priorities.low}
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        {d.priorities.medium}
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        {d.priorities.high}
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        {d.priorities.critical}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">{modal.fields.status}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{d.statuses.active}</SelectItem>
                    <SelectItem value="pending">{d.statuses.pending}</SelectItem>
                    <SelectItem value="review">{d.statuses.review}</SelectItem>
                    <SelectItem value="closed">{d.statuses.closed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedHours" className="text-sm font-medium">{d.estimatedHours}</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="estimatedHours"
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                    placeholder="40"
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <FileUp className="w-4 h-4 text-purple-600" />
              {d.documents}
            </div>
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                <FileUp className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{d.dragDropHint}</p>
                <label className="cursor-pointer">
                  <span className="text-purple-600 hover:text-purple-700 font-medium">{d.browseFiles}</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{d.fileTypesHint}</p>
              </div>
              
              {documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{tf(d.uploadedDocuments, { count: documents.length })}</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {documents.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-48">{file.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                          className="h-8 w-8 p-0 hover:bg-red-100"
                          aria-label={t.common.delete}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-slate-200/90 dark:border-slate-800 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              disabled={isSubmitting}
            >
              {t.common.cancel}
            </Button>
            <Button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent me-2" />
                  {modal.creating}
                </>
              ) : (
                modal.createCase
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCaseDialog;
