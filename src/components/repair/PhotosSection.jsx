import React, { useState } from 'react';
import { uploadRepairPhoto, deleteRepairPhoto } from '@/lib/api';
import { Camera, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';

export default function PhotosSection({ ticket, repairId, setTicket }) {
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const newPhoto = await uploadRepairPhoto(repairId, file);
      setTicket(prev => ({
        ...prev,
        photos: [newPhoto, ...(prev.photos || [])]
      }));
    } catch (error) {
      console.error("Failed to upload photo:", error);
      alert("Failed to upload photo: " + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handlePhotoDelete = async (photoId) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await deleteRepairPhoto(repairId, photoId);
      setTicket(prev => ({
        ...prev,
        photos: prev.photos.filter(p => p.id !== photoId)
      }));
    } catch (error) {
      console.error("Failed to delete photo:", error);
      alert("Failed to delete photo.");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-2">
          <ImageIcon size={18} /> Photos
        </h3>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <button
            className={`text-xs bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-600 group-hover:text-white text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {isUploading ? 'Uploading...' : 'Add Photo'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ticket.photos?.map(photo => (
          <div key={photo.id} className="group relative aspect-square bg-zinc-50 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
              <img
                src={photo.url}
                alt="Repair"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </a>
            <button
              onClick={(e) => { e.preventDefault(); handlePhotoDelete(photo.id); }}
              className="absolute top-2 right-2 bg-black/50 hover:bg-red-600/90 text-zinc-900 dark:text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
              title="Delete Photo"
            >
              <Trash2 size={14} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-zinc-700 dark:text-zinc-300 text-center">
                {new Date(photo.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        {(!ticket.photos || ticket.photos.length === 0) && (
          <div className="col-span-full py-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 text-sm">
            <Camera size={24} className="mx-auto mb-2 opacity-50" />
            No photos uploaded yet
          </div>
        )}
      </div>
    </div>
  );
}
