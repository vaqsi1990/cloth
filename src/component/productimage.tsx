
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ImageModal from "@/component/ImageModal";
import UploadLoadingIndicator from "@/component/UploadLoadingIndicator";
import { X } from "lucide-react";
import ProductPhotoBackgroundConsent from "@/components/ProductPhotoBackgroundConsent";
import { showToast } from "@/utils/toast";
import { getUploadResultUrls, type UploadFileResult } from "@/lib/upload-result-url";
import { uploadFiles } from "@/utils/uploadthing";
import { prepareImagesForUpload } from "@/lib/prepare-images-for-upload";

const MAX_FILES_PER_UPLOAD = 4;

function normalizeUploadResults(res: unknown): UploadFileResult[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as UploadFileResult[];
  return [res as UploadFileResult];
}

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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const imageUrlsRef = useRef(imageUrls);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUploading) {
      const next = value || [];
      setImageUrls(next);
      imageUrlsRef.current = next;
    }
  }, [value, isUploading]);

  const updateImageUrls = useCallback((nextUrls: string[]) => {
    imageUrlsRef.current = nextUrls;
    setImageUrls(nextUrls);
    onChange(nextUrls);
  }, [onChange]);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const filesToUpload = selectedFiles.slice(0, MAX_FILES_PER_UPLOAD);
    if (selectedFiles.length > MAX_FILES_PER_UPLOAD) {
      showToast(
        `ერთდროულად მაქსიმუმ ${MAX_FILES_PER_UPLOAD} სურათის ატვირთვაა შესაძლებელი`,
        "error",
      );
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });

    const initialImageCount = imageUrlsRef.current.length;
    let failedCount = 0;

    try {
      const prepared = await prepareImagesForUpload(filesToUpload);

      for (let index = 0; index < prepared.length; index++) {
        const file = prepared[index];
        setUploadProgress({ current: index + 1, total: prepared.length });

        try {
          const res = await uploadFiles("imageUploader", { files: [file] });
          const urls = getUploadResultUrls(normalizeUploadResults(res));
          updateImageUrls([...imageUrlsRef.current, ...urls]);
        } catch (error) {
          failedCount += 1;
          const message = error instanceof Error ? error.message : "ატვირთვა ვერ მოხერხდა";
          showToast(`შეცდომა ატვირთვისას: ${message}`, "error");
        }
      }

      const uploadedCount = imageUrlsRef.current.length - initialImageCount;
      if (uploadedCount > 0 && failedCount === 0) {
        showToast(
          uploadedCount === 1
            ? "სურათი აიტვირთა"
            : `${uploadedCount} სურათი აიტვირთა`,
          "success",
        );
      } else if (uploadedCount > 0 && failedCount > 0) {
        showToast(`${uploadedCount} სურათი აიტვირთა, ${failedCount} ვერ აიტვირთა`, "error");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "ატვირთვა ვერ მოხერხდა";
      showToast(`შეცდომა ატვირთვისას: ${message}`, "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteImage = (indexToDelete: number) => {
    updateImageUrls(imageUrlsRef.current.filter((_, index) => index !== indexToDelete));
  };

  const validImageUrls = imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');

  const urlToIndexMap = new Map<string, number>();
  imageUrls.forEach((url, index) => {
    if (url && typeof url === 'string' && url.trim() !== '') {
      urlToIndexMap.set(url, index);
    }
  });

  const loadingMessage = uploadProgress
    ? `სურათები იტვირთება... (${uploadProgress.current}/${uploadProgress.total})`
    : "სურათები იტვირთება...";

  return (
    <div className="relative text-white p-2 rounded">
      {isUploading && (
        <div className="absolute inset-0 bg-white/80 rounded z-20 flex items-center justify-center">
          <UploadLoadingIndicator message={loadingMessage} />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={isUploading}
        onChange={handleFilePick}
      />

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className={`bg-blue-600 md:w-[50%] w-full text-center hover:bg-blue-700 text-white font-bold py-2 px-4 rounded md:text-[18px] text-[16px] ${isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {isUploading ? "იტვირთება..." : "სურათების ატვირთვა"}
        </button>
        <p className="text-black text-[16px] mt-1 text-center">
          ყველა ტიპის სურათი (PNG, JPG, GIF, WebP) — შეგიძლიათ {MAX_FILES_PER_UPLOAD} სურათამდე ერთდროულად აირჩიოთ
        </p>
      </div>

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
        <p className="mt-1 text-gray-400 text-sm text-center">
          სურათები ჯერ არ არის ატვირთული. ფაილის არჩევისას შეგიძლიათ {MAX_FILES_PER_UPLOAD} სურათამდე ერთდროულად მონიშნოთ.
        </p>
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
