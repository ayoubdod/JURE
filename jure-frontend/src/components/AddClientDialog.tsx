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

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddClientDialog = ({ open, onOpenChange }: AddClientDialogProps) => {
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
        title: "✨ Client Added Successfully",
        description: `${formData.firstName} ${formData.lastName} has been added to your client list.`,
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
        title: "❌ Error Adding Client",
        description: "Failed to add client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClientTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return <User className="w-4 h-4" />;
      case 'business': return <Briefcase className="w-4 h-4" />;
      case 'nonprofit': return <Heart className="w-4 h-4" />;
      default: return null;
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
                Add New Client
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Fill in the client information below to add them to your practice.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                              <User className="w-4 h-4 text-jure-600" />
              Personal Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium flex items-center gap-1">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium flex items-center gap-1">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                  placeholder="Enter last name"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Mail className="w-4 h-4 text-jure-600" />
              Contact Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                  Email <span className="text-red-500">*</span>
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
                    placeholder="client@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Building2 className="w-4 h-4 text-jure-600" />
              other Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientType" className="text-sm font-medium">Client Type</Label>
                <Select value={formData.clientType} onValueChange={(value) => setFormData({...formData, clientType: value})}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600">
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual" className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Individual
                      </div>
                    </SelectItem>
                    <SelectItem value="business" className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Business
                      </div>
                    </SelectItem>
                    <SelectItem value="nonprofit" className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        Non-profit
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 text-jure-600" />
              Additional Information
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={2}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600 resize-none"
                    placeholder="Enter full address"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600 resize-none"
                    placeholder="Add any additional notes about the client..."
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
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-jure-600 hover:bg-jure-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Adding Client...
                </>
              ) : (
                'Add Client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;