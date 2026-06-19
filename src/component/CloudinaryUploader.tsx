
"use client";

import HeicAwareUploadButton from "@/components/HeicAwareUploadButton";
import { useEffect, useState } from "react";
import Image from "@/component/AppImage";
import UploadLoadingIndicator from "@/component/UploadLoadingIndicator";
import { showToast } from "@/utils/toast";
import { getUploadResultUrls } from "@/lib/upload-result-url";

type ImageUploadProps = {
  onChange: (urls: string[]) => void;
  value: string[];
  variant?: "default" | "document";
};

const ImageUpload = ({ onChange, value, variant = "default" }: ImageUploadProps): React.JSX.Element => {
  const [imageUrls, setImageUrls] = useState<string[]>(value || []);
  const [isUploading, setIsUploading] = useState(false);
  const isDocument = variant === "document";

  useEffect(() => {
    setImageUrls(value || []);
  }, [value]);

  const handleUploadComplete = (res: Parameters<typeof getUploadResultUrls>[0]) => {
    const urls = getUploadResultUrls(res);
    const newUrls = isDocument ? urls.slice(0, 1) : [...imageUrls, ...urls];
    setImageUrls(newUrls);
    onChange(newUrls);
    setIsUploading(false);
    showToast("სურათი აიტვირთა", "success");
  };

  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    setIsUploading(false);
    showToast(`შეცდომა ატვირთვისას: ${error.message}`, "error");
  };

  const handleUploadBegin = () => {
    setIsUploading(true);
  };

  const handleClear = () => {
    setImageUrls([]);
    onChange([]);
  };

  const loadingOverlay = isUploading ? (
    <div className="absolute inset-0 bg-white/85 rounded-xl flex items-center justify-center z-20">
      <UploadLoadingIndicator message="სურათი იტვირთება..." />
    </div>
  ) : null;

  if (isDocument) {
    return (
      <div className="relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-black transition-colors">
        {loadingOverlay}

        {imageUrls.length > 0 ? (
          <div className="space-y-3">
            <div className="relative group max-w-xs mx-auto">
              <Image
                src={imageUrls[0]}
                alt="ატვირთული დოკუმენტი"
                className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                width={300}
                height={192}
              />
              <button
                onClick={handleClear}
                disabled={isUploading}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm disabled:opacity-50"
                type="button"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-green-600 text-center">✓ სურათი ატვირთულია</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-3">სურათი ჯერ არ არის ატვირთული</p>
          </div>
        )}

        {imageUrls.length === 0 && (
          <div className="flex justify-center">
            <HeicAwareUploadButton
              className="text-white font-medium py-2 px-5 rounded-xl transition-colors disabled:opacity-50"
              endpoint="imageUploader"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              onUploadBegin={handleUploadBegin}
              disabled={isUploading}
              content={{
                button: isUploading ? "იტვირთება..." : "სურათის ატვირთვა",
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-black transition-colors">
      {loadingOverlay}

      <div className="mb-4">
        {imageUrls.length === 0 ? (
          <div>
            <HeicAwareUploadButton
              className=" text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center space-x-2 disabled:opacity-50"
              endpoint="imageUploader"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              onUploadBegin={handleUploadBegin}
              disabled={isUploading}
              content={{
                button: isUploading ? "იტვირთება..." : undefined,
              }}
            />
            {isUploading && (
              <UploadLoadingIndicator className="mt-3" message="სურათები იტვირთება..." />
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="mb-2">სურათები წარმატებით აიტვირთა!</p>
            <button
              onClick={handleClear}
              disabled={isUploading}
              className="block mx-auto mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              type="button"
            >
             სურათების წაშლა
            </button>
          </div>
        )}
      </div>

      {imageUrls.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">აიტვირთა სურათები</h3>
            <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
              {imageUrls.length} სურათი{imageUrls.length !== 1 ? 's' : ''}
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
                  type="button"
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
          <p className="text-gray-500 text-[18px]">სურათები არ არის ჯერ ატვირთული</p>
          <p className="text-gray-400 text-[16px] mt-1">დააჭირეთ ღილაკზე სურათების ატვირთვისთვის</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
