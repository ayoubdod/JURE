// src/components/dashboard/MatterCloseModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, FileText, BookOpen, Award } from 'lucide-react';
import { useState } from 'react';

export default function MatterCloseModal({open, onOpenChange}:{open:boolean; onOpenChange:(v:boolean)=>void}) {
  const [lessons, setLessons] = useState('');
  const [outcome, setOutcome] = useState('');
  const [precedents, setPrecedents] = useState('');

  const save = () => {
    // TODO: send to backend
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B] overflow-hidden">
          {/* Decorative Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Header Content */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Matter Close Summary
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  Document the outcome and lessons learned
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              Outcome
            </label>
            <Textarea 
              placeholder="Outcome (won/settled/dismissed)…" 
              value={outcome} 
              onChange={e=>setOutcome(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Lessons Learned
            </label>
            <Textarea 
              placeholder="Lessons learned / strategy notes…" 
              value={lessons} 
              onChange={e=>setLessons(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Precedents
            </label>
            <Textarea 
              placeholder="Precedents / documents to save to library…" 
              value={precedents} 
              onChange={e=>setPrecedents(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="px-8 pb-6 pt-0 border-t border-gray-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} className="bg-purple-600 hover:bg-purple-700">
            Save Summary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
