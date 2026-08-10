import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { BACKEND_BASE_URL, MessageAttachmentKind } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';

interface MediaGalleryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: API.MessageAttachment[];
  initialIndex?: number;
}

const MediaGalleryDialog: React.FC<MediaGalleryDialogProps> = ({
  isOpen,
  onClose,
  attachments,
  initialIndex = 0,
}) => {
  const { t, tf } = useAppTranslation();
  const m = t.conversations.mediaGallery;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const mediaAttachments = attachments
    .map(attachment => ({
      ...attachment,
      file: BACKEND_BASE_URL + attachment.file,
    }))
    .filter(attachment =>
      [MessageAttachmentKind.IMAGE, MessageAttachmentKind.VIDEO].includes(attachment.kind)
    );

  const handleClose = () => {
    setCurrentIndex(0);
    onClose();
  };

  if (mediaAttachments.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {tf(m.title, { current: currentIndex + 1, total: mediaAttachments.length })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 p-6 pt-0">
          <Carousel
            className="w-full h-full"
            opts={{
              startIndex: initialIndex,
            }}
            setApi={(api) => {
              if (api) {
                api.on('select', () => {
                  setCurrentIndex(api.selectedScrollSnap());
                });
              }
            }}
          >
            <CarouselContent className="h-full">
              {mediaAttachments.map((attachment, index) => (
                <CarouselItem key={attachment.id} className="h-full">
                  <div className="flex items-center justify-center h-full bg-black rounded-lg overflow-hidden">
                    {attachment.kind === MessageAttachmentKind.IMAGE ? (
                      <img
                        src={attachment.file}
                        alt={tf(m.mediaAlt, { index: index + 1 })}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : attachment.kind === MessageAttachmentKind.VIDEO ? (
                      <video
                        src={attachment.file}
                        controls
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLVideoElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {mediaAttachments.length > 1 && (
              <>
                <CarouselPrevious className="-left-4" />
                <CarouselNext className="-right-4" />
              </>
            )}
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaGalleryDialog;
