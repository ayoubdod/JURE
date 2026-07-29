import React, { useState } from 'react';
import { ArrowLeft, Upload, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const AddTeamMember = ({ onMemberAdded, onCancel }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Personal Information
    photo: null,
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dateAdded: new Date().toISOString().split('T')[0],
    
    // Professional Information
    title: '',
    barNumber: '',
    specialization: '',
    yearsExperience: '',
    supervisor: '',
    
    // Administrative Information
    status: '',
    contractType: '',
    salary: '',
    contract: null,
    diploma: null,
    certifications: null
  });

  const { toast } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Call the parent component's callback with the new member data
    onMemberAdded({
      id: Date.now(), // temporary ID
      name: formData.fullName,
      role: formData.title,
      specialization: formData.specialization,
      email: formData.email,
      phone: formData.phone,
      location: formData.address,
      joinDate: formData.dateAdded,
      cases: 0,
      status: formData.status,
      avatar: formData.fullName.split(' ').map(n => n[0]).join('')
    });

    toast({
      title: "Team Member Added",
      description: `${formData.fullName} has been successfully added to the team.`,
    });
    
    if (onCancel) onCancel();
  };

  const tabs = [
    { id: 'personal', label: 'Informations personnelles' },
    { id: 'professional', label: 'Informations professionnelles' },
    { id: 'administrative', label: 'Informations administratives' }
  ];

  const FileUploadArea = ({ field, label, accept = "*/*" }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-2">Glisser-déposer ou parcourir</p>
        <input
          type="file"
          accept={accept}
          onChange={(e) => handleFileUpload(field, e.target.files[0])}
          className="hidden"
          id={field}
        />
        <label
          htmlFor={field}
          className="text-purple-600 hover:text-purple-700 cursor-pointer text-sm underline"
        >
          Choisir le fichier
        </label>
        {formData[field] && (
          <p className="text-sm text-green-600 mt-2">
            Fichier sélectionné: {formData[field].name}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Add new team member</h1>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="ml-auto p-2 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Rest of the component remains the same */}
        {/* ... */}
      </div>
    </div>
  );
};

export default AddTeamMember;