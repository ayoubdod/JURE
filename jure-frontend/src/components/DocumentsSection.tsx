import React, { useRef, useState } from 'react';
import { Search, Filter, FileText, Eye, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Button } from './ui/button';
import DocumentPreviewModal, { DocumentPreviewModalRef } from './document/DocumentPreviewModal';
import DocumentDeleteModal, { DocumentDeleteModalRef } from './document/DocumentDeleteModal';

const DocumentsSection = ({documents,onDeleteSuccess}:{documents:API.Document[],onDeleteSuccess:(instance:API.Document)=>void}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const deleteModalRef = useRef<DocumentDeleteModalRef>(null);
  const previewModalRef = useRef<DocumentPreviewModalRef>(null);

  const handlePreview = (document: API.Document) => {
    previewModalRef.current?.show(document);
  };

  const handleDelete = (document: API.Document) => {
    deleteModalRef.current?.show(document);
  };

  const handlePrint = () => {
    window.print();
  };

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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Documents</h3>
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
                  <DialogTitle>Filtrer les documents</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type de document</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">PDF</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">DOCX</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">XLSX</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">Images</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Taille</label>
                    <select className="w-full border rounded-lg px-3 py-2">
                      <option>Toutes les tailles</option>
                      <option>Moins de 1 MB</option>
                      <option>1-5 MB</option>
                      <option>Plus de 5 MB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date de création</label>
                    <select className="w-full border rounded-lg px-3 py-2">
                      <option>Toutes les dates</option>
                      <option>Aujourd'hui</option>
                      <option>Cette semaine</option>
                      <option>Ce mois</option>
                    </select>
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button className="flex-1">Appliquer</Button>
                    <Button variant="outline" className="flex-1">Réinitialiser</Button>
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
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {documents.filter((doc)=>doc.title.toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <FileText className="text-slate-600 dark:text-slate-400" size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white">{doc.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{doc.created} • {doc.size}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handlePreview(doc)}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                >
                  <Eye size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(doc)}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DocumentDeleteModal ref={deleteModalRef} onSuccess={onDeleteSuccess} />
      <DocumentPreviewModal ref={previewModalRef} />
    </div>
  );
};

export default DocumentsSection;
