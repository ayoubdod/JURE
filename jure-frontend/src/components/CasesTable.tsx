
import React, { useState } from 'react';
import { Search, Filter, FileText, MoreHorizontal, Edit, UserPlus, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { useAppTranslation } from '@/i18n';

interface CasesTableProps {
  cases: API.Case[];
  hide_assigned_to?: boolean;
}

interface FilterState {
  statuses: API.CaseStatus[];
  category: API.CaseCategory | 'ALL';
  clientName: string;
}

const CasesTable = ({ cases, hide_assigned_to = false }: CasesTableProps) => {
  const { enumPretty } = useAppTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<API.Case | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    statuses: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED', 'PENDING', 'ARCHIVED', 'CONVERTED_TO_CASE'],
    category: 'ALL',
    clientName: ''
  });

  const getStatusColor = (status: API.CaseStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-orange-100 text-orange-800';
      case 'ARCHIVED':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100';
      case 'CONVERTED_TO_CASE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100';
    }
  };

  const getCategoryLabel = (category: API.CaseCategory) => {
    switch (category) {
      case 'CRIMINAL':
        return 'Criminal';
      case 'CIVIL':
        return 'Civil';
      case 'ECONOMIC':
        return 'Economic';
      case 'ENVIRONMENTAL':
        return 'Environmental';
      case 'SOCIAL':
        return 'Social';
      case 'OTHER':
        return 'Other';
      default:
        return category;
    }
  };

  const getStatusLabel = (status: API.CaseStatus) => enumPretty(status) || status;

  const handleCaseClick = (caseItem: API.Case) => {
    setSelectedCase(caseItem);
    setCaseDetailsOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (_caseId: number) => {
    // Add delete logic here
  };

  const handleStatusChange = (status: API.CaseStatus, checked: boolean | string) => {
    const isChecked = checked === true || checked === 'indeterminate';
    setFilters(prev => ({
      ...prev,
      statuses: isChecked 
        ? [...prev.statuses, status]
        : prev.statuses.filter(s => s !== status)
    }));
  };

  const handleCategoryChange = (category: string) => {
    setFilters(prev => ({
      ...prev,
      category: category as API.CaseCategory | 'ALL'
    }));
  };

  const handleClientNameChange = (clientName: string) => {
    setFilters(prev => ({
      ...prev,
      clientName
    }));
  };

  const applyFilters = () => {
    setFilterModalOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      statuses: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED', 'PENDING', 'ARCHIVED', 'CONVERTED_TO_CASE'],
      category: 'ALL',
      clientName: ''
    });
  };

  const filteredCases = cases.filter(caseItem => {
    // Search term filter
    const matchesSearch = caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (caseItem.client && `${caseItem.client.first_name} ${caseItem.client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus = filters.statuses.includes(caseItem.status);

    // Category filter
    const matchesCategory = filters.category === 'ALL' || caseItem.category === filters.category;

    // Client name filter
    const matchesClientName = !filters.clientName || 
      (caseItem.client && 
        `${caseItem.client.first_name} ${caseItem.client.last_name}`.toLowerCase().includes(filters.clientName.toLowerCase()));

    return matchesSearch && matchesStatus && matchesCategory && matchesClientName;
  });

  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg shadow-sm">
      <style>
        {`
          .modal-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .modal-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .modal-scrollbar::-webkit-scrollbar-thumb {
            background: #8b5cf6;
            border-radius: 4px;
          }
          .modal-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #7c3aed;
          }
        `}
      </style>

      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All Cases</h3>
          <div className="flex space-x-2">
            {/* Filter Dialog */}
            <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
              <DialogTrigger asChild>
                <button className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center space-x-2">
                  <Filter size={16} />
                  <span>Filter</span>
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-lg modal-scrollbar max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Filter Cases</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status-filter" className="block text-sm font-medium mb-2">Status</Label>
                    <div className="space-y-2">
                                             <div className="flex items-center space-x-2">
                         <Checkbox
                           id="open"
                           checked={filters.statuses.includes('OPEN')}
                           onCheckedChange={(checked) => handleStatusChange('OPEN', checked)}
                         />
                         <Label htmlFor="open" className="text-sm">{getStatusLabel('OPEN')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Checkbox
                           id="in-progress"
                           checked={filters.statuses.includes('IN_PROGRESS')}
                           onCheckedChange={(checked) => handleStatusChange('IN_PROGRESS', checked)}
                         />
                         <Label htmlFor="in-progress" className="text-sm">{getStatusLabel('IN_PROGRESS')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Checkbox
                           id="closed"
                           checked={filters.statuses.includes('CLOSED')}
                           onCheckedChange={(checked) => handleStatusChange('CLOSED', checked)}
                         />
                         <Label htmlFor="closed" className="text-sm">{getStatusLabel('CLOSED')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Checkbox
                           id="cancelled"
                           checked={filters.statuses.includes('CANCELLED')}
                           onCheckedChange={(checked) => handleStatusChange('CANCELLED', checked)}
                         />
                         <Label htmlFor="cancelled" className="text-sm">{getStatusLabel('CANCELLED')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Checkbox
                           id="pending"
                           checked={filters.statuses.includes('PENDING')}
                           onCheckedChange={(checked) => handleStatusChange('PENDING', checked)}
                         />
                         <Label htmlFor="pending" className="text-sm">{getStatusLabel('PENDING')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Checkbox
                           id="archived"
                           checked={filters.statuses.includes('ARCHIVED')}
                           onCheckedChange={(checked) => handleStatusChange('ARCHIVED', checked)}
                         />
                         <Label htmlFor="archived" className="text-sm">{getStatusLabel('ARCHIVED')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <Checkbox
                           id="converted-to-case"
                           checked={filters.statuses.includes('CONVERTED_TO_CASE')}
                           onCheckedChange={(checked) => handleStatusChange('CONVERTED_TO_CASE', checked)}
                         />
                         <Label htmlFor="converted-to-case" className="text-sm">{getStatusLabel('CONVERTED_TO_CASE')}</Label>
                       </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category-filter" className="block text-sm font-medium mb-2">Category</Label>
                    <Select onValueChange={handleCategoryChange} value={filters.category}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Categories</SelectItem>
                        <SelectItem value="CRIMINAL">{enumPretty('CRIMINAL')}</SelectItem>
                        <SelectItem value="CIVIL">{enumPretty('CIVIL')}</SelectItem>
                        <SelectItem value="ECONOMIC">{enumPretty('ECONOMIC')}</SelectItem>
                        <SelectItem value="ENVIRONMENTAL">{enumPretty('ENVIRONMENTAL')}</SelectItem>
                        <SelectItem value="SOCIAL">{enumPretty('SOCIAL')}</SelectItem>
                        <SelectItem value="OTHER">{enumPretty('OTHER')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="client-name-filter" className="block text-sm font-medium mb-2">Client Name</Label>
                    <Input
                      type="text"
                      id="client-name-filter"
                      placeholder="Enter client name"
                      value={filters.clientName}
                      onChange={(e) => handleClientNameChange(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button onClick={applyFilters} className="flex-1">Apply Filters</Button>
                    <Button onClick={resetFilters} variant="outline" className="flex-1">Reset Filters</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <button onClick={handlePrint} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center space-x-2">
              <FileText size={16} />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
          <Input
            type="text"
            placeholder="Search by title, reference or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              {!hide_assigned_to && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Assigned to
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200">
            {filteredCases.map((caseItem) => (
              <tr key={caseItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input type="checkbox" className="rounded" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <button 
                      onClick={() => handleCaseClick(caseItem)}
                      className="text-jure-600 hover:text-jure-800 hover:underline font-medium"
                    >
                      {caseItem.title}
                    </button>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{caseItem.reference}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {caseItem.client ? (
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-jure-100 flex items-center justify-center mr-3">
                                                  <span className="text-sm font-medium text-jure-600">
                          {caseItem.client.first_name[0]}{caseItem.client.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {caseItem.client.first_name} {caseItem.client.last_name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{caseItem.client.email}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">No client assigned</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-900 dark:text-white">{getCategoryLabel(caseItem.category)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(caseItem.status)}`}>
                    {getStatusLabel(caseItem.status)}
                  </span>
                </td>
                {!hide_assigned_to && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {caseItem.assigned_to ? (
                        <>
                          <UserAvatar
                            image={getPersonImage(caseItem.assigned_to as Record<string, unknown>)}
                            firstName={caseItem.assigned_to.first_name}
                            lastName={caseItem.assigned_to.last_name}
                            size="sm"
                            className="h-8 w-8 shrink-0 mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {caseItem.assigned_to.first_name} {caseItem.assigned_to.last_name}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{caseItem.assigned_to.email}</div>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400">
                        <MoreHorizontal size={20} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2 bg-white dark:bg-slate-950 rounded-lg shadow-lg border z-50">
                      <div className="space-y-1">
                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded flex items-center">
                          <Edit size={16} className="mr-2" />
                          Edit
                        </button>
                        <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded flex items-center">
                          <UserPlus size={16} className="mr-2" />
                          Assign
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded flex items-center">
                              <Trash2 size={16} className="mr-2" />
                              Delete
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This case will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(caseItem.id)} className="bg-red-600 hover:bg-red-700">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </PopoverContent>
                  </Popover>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCases.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No cases found
        </div>
      )}

      {/* Case Details Dialog */}
      <Dialog open={caseDetailsOpen} onOpenChange={setCaseDetailsOpen}>
        <DialogContent className="rounded-lg modal-scrollbar max-h-[80vh] overflow-y-auto max-w-4xl">
          <DialogHeader>
            <DialogTitle>Case Details</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCase.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reference</label>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCase.reference}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client</label>
                  {selectedCase.client ? (
                    <p className="text-sm text-slate-900 dark:text-white">
                      {selectedCase.client.first_name} {selectedCase.client.last_name}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">No client assigned</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <p className="text-sm text-slate-900 dark:text-white">{getCategoryLabel(selectedCase.category)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedCase.status)}`}>
                    {getStatusLabel(selectedCase.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned to</label>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {selectedCase.assigned_to.first_name} {selectedCase.assigned_to.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Court</label>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCase.court}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Firm</label>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCase.cabinet}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Created Date</label>
                  <p className="text-sm text-slate-900 dark:text-white">{new Date(selectedCase.created).toLocaleDateString('en-US')}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Summary</label>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded">
                  {selectedCase.summary}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded">
                  {selectedCase.description}
                </p>
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Associated Documents</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                    <span className="text-sm">Main file.pdf</span>
                    <Button size="sm" variant="outline">
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                    <span className="text-sm">Correspondence.docx</span>
                    <Button size="sm" variant="outline">
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div> */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CasesTable;
