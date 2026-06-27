
"use client";

import HeicAwareUploadButton from "@/components/HeicAwareUploadButton";
import { useState, useEffect, useRef, useCallback } from "react";
import ImageModal from "@/component/ImageModal";
import UploadLoadingIndicator from "@/component/UploadLoadingIndicator";
import { X } from "lucide-react";
import ProductPhotoBackgroundConsent from "@/components/ProductPhotoBackgroundConsent";
import { showToast } from "@/utils/toast";
import { getUploadResultUrls } from "@/lib/upload-result-url";


type ImageUploadProps = {
  onChange: (urls: string[]) => void
  value: string[]
  onUploadingChange?: (isUploading: boolean) => void
  photoBackgroundConsent?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    error?: string;
  };
};

const ImageUploadForProduct = ({ onChange, value, onUploadingChange, photoBackgroundConsent }: ImageUploadProps): React.JSX.Element => {
  const [imageUrls, setImageUrls] = useState<string[]>(value || []);
  const [isUploading, setIsUploading] = useState(false);
  const imageUrlsRef = useRef(imageUrls);

  useEffect(() => {
    setImageUrls(value || []);
  }, [value]);

  imageUrlsRef.current = imageUrls;

  const updateImageUrls = useCallback((nextUrls: string[]) => {
    imageUrlsRef.current = nextUrls;
    setImageUrls(nextUrls);
    onChange(nextUrls);
  }, [onChange]);

  const setUploading = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  }, [onUploadingChange]);

  const handleUploadComplete = (res: Parameters<typeof getUploadResultUrls>[0]) => {
    const urls = getUploadResultUrls(res);
    updateImageUrls([...imageUrlsRef.current, ...urls]);
    setUploading(false);
  };

  const handleUploadError = (error: Error) => {
    setUploading(false);
    showToast(`შეცდომა ატვირთვისას: ${error.message}`, "error");
  };

  const handleUploadBegin = () => {
    setUploading(true);
  };

  const handleDeleteImage = (indexToDelete: number) => {
    updateImageUrls(imageUrlsRef.current.filter((_, index) => index !== indexToDelete));
  };

  const validImageUrls = imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');

  // Create a map of valid URLs to their original indices
  const urlToIndexMap = new Map<string, number>();
  imageUrls.forEach((url, index) => {
    if (url && typeof url === 'string' && url.trim() !== '') {
      urlToIndexMap.set(url, index);
    }
  });

  return (
    <div className="relative text-white p-2 rounded">
      {isUploading && (
        <div className="absolute inset-0 bg-white/80 rounded z-20 flex items-center justify-center">
          <UploadLoadingIndicator message="სურათები იტვირთება..." />
        </div>
      )}
      <HeicAwareUploadButton
        className="text-white  font-bold py-1 px-3 rounded text-sm"
        endpoint="imageUploader"
        onClientUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        onUploadBegin={handleUploadBegin}
        disabled={isUploading}
        content={{
          button: isUploading ? "იტვირთება..." : "სურათების ატვირთვა",
          allowedContent: "ყველა ტიპის სურათი (PNG, JPG, GIF, WebP) - შეგიძლიათ რამდენიმე ატვირთოთ",
        }}
        appearance={{
          button: `bg-blue-600 md:w-[50%] w-full text-center hover:bg-blue-700 text-white font-bold py-2 px-4 rounded md:text-[18px] text-[16px] ${isUploading ? "opacity-60 cursor-not-allowed" : ""}`,
          allowedContent: "text-black text-[16px] text-black mt-1",
        }}
      />

      {validImageUrls.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold text-black">
            ატვირთული სურათები ({validImageUrls.length}{isUploading ? "+" : ""})
          </h2>
          <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
            {validImageUrls.map((url, displayIndex) => {
              const originalIndex = urlToIndexMap.get(url) ?? displayIndex;
              return (
                <div key={`${url}-${originalIndex}`} className="relative group">
                  <ImageModal  
                    src={url}
                    alt={`ატვირთული ${displayIndex + 1}`}
                    className="rounded border border-gray-500 items-center h-[320px] object-cover w-full"
                  />
                  <button
                    onClick={() => handleDeleteImage(originalIndex)}
                    className="absolute cursor-pointer top-2 right-2 z-10 flex h-8 w-8 touch-manipulation items-center justify-center rounded-full bg-black text-white opacity-100 shadow-lg transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    type="button"
                    aria-label="სურათის წაშლა"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-1 text-gray-400 text-sm text-center">სურათები ჯერ არ არის ატვირთული. შეგიძლიათ რამდენიმე სურათი ერთდროულად ატვირთოთ (Ctrl+Click ან Shift+Click).</p>
      )}

      {photoBackgroundConsent && (
        <ProductPhotoBackgroundConsent
          checked={photoBackgroundConsent.checked}
          onChange={photoBackgroundConsent.onChange}
          error={photoBackgroundConsent.error}
        />
      )}
    </div>
  );
};

export default ImageUploadForProduct;
