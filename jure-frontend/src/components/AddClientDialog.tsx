import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Building2, Mail, Phone, MapPin, FileText, Users, Briefcase, Heart } from 'lucide-react';
import { apiCreateClient } from '@/services/client/api';
import { devError } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddClientDialog = ({ open, onOpenChange }: AddClientDialogProps) => {
  const { t, tf } = useAppTranslation();
  const m = t.clients.modal;
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clientType: '',
    address: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload: API.ClientCreateForm = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
    };

    try {
      await apiCreateClient(payload);

      toast({
        title: m.toastSuccessTitle,
        description: tf(m.toastSuccessDescription, {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
        }),
      });
      
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        clientType: '',
        address: '',
        notes: ''
      });
      onOpenChange(false);
    } catch (error) {
      devError('Error adding client:', error);
      toast({
        title: m.toastErrorTitle,
        description: m.toastErrorDescription,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-jure-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {m.createTitle}
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                {m.createDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <User className="w-4 h-4 text-jure-600" />
              {m.personalInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium flex items-center gap-1">
                  {m.firstName} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                  placeholder={m.firstNamePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium flex items-center gap-1">
                  {m.lastName} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                  placeholder={m.lastNamePlaceholder}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Mail className="w-4 h-4 text-jure-600" />
              {m.contactInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                  {m.email} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                    placeholder={m.emailPlaceholder}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">{m.phone}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                    placeholder={m.phonePlaceholder}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Building2 className="w-4 h-4 text-jure-600" />
              {m.otherInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientType" className="text-sm font-medium">{m.clientType}</Label>
                <Select value={formData.clientType} onValueChange={(value) => setFormData({...formData, clientType: value})}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600">
                    <SelectValue placeholder={m.selectClientType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual" className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {m.individual}
                      </div>
                    </SelectItem>
                    <SelectItem value="business" className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {m.business}
                      </div>
                    </SelectItem>
                    <SelectItem value="nonprofit" className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        {m.nonprofit}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 text-jure-600" />
              {m.additionalInfo}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">{m.address}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={2}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600 resize-none"
                    placeholder={m.addressPlaceholder}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">{m.notes}</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600 resize-none"
                    placeholder={m.notesPlaceholder}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-gray-100 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="transition-all duration-200 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              {t.common.cancel}
            </Button>
            <Button 
              type="submit" 
              className="bg-jure-600 hover:bg-jure-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent me-2" />
                  {m.addingClient}
                </>
              ) : (
                m.addClient
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
