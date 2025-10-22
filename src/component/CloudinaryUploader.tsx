
"use client";

import { UploadButton } from "@/utils/uploadthing";
import { useState } from "react";
import Image from "next/image";

type ImageUploadProps = {
  onChange: (urls: string[]) => void;
  value: string[];
};

const ImageUpload = ({ onChange, value }: ImageUploadProps): React.JSX.Element => {
  const [imageUrls, setImageUrls] = useState<string[]>(value || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (res: { url: string }[]) => {
    console.log("Upload complete:", res);
    const urls = res.map((file) => file.url);
    const newUrls = [...imageUrls, ...urls];
    setImageUrls(newUrls);
    onChange(newUrls);
    setIsUploading(false);
    alert("Files uploaded successfully!");
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    setIsUploading(false);
    alert(`Upload error: ${error.message}`);
  };

  const handleUploadBegin = () => {
    console.log("Upload started");
    setIsUploading(true);
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-pink-500 transition-colors">
      <div className="mb-4">
        {imageUrls.length === 0 ? (
          <div>
            <UploadButton
              className="bg-[#d90b6b] hover:bg-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center space-x-2 disabled:opacity-50"
              endpoint="imageUploader"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              onUploadBegin={handleUploadBegin}
              disabled={isUploading}
            />
            {isUploading && (
              <p className="text-sm text-gray-600 mt-2">Uploading images...</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="mb-2">Images uploaded successfully!</p>
            <button
              onClick={() => {
                setImageUrls([]);
                onChange([]);
              }}
              className="block mx-auto mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Remove All Images
            </button>
          </div>
        )}
      </div>

      {imageUrls.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Uploaded Images</h3>
            <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
              {imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <Image  
                  src={url}
                  alt={`Uploaded image ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-gray-200 hover:border-pink-500 transition-colors"
                  width={150}
                  height={228}
                />
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
                <button
                  onClick={() => {
                    const newUrls = imageUrls.filter((_, i) => i !== index);
                    setImageUrls(newUrls);
                    onChange(newUrls);
                  }}
                  className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No images uploaded yet</p>
          <p className="text-gray-400 text-xs mt-1">Click the button above to upload images</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
