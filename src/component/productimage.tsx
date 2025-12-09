
"use client";

import { UploadButton } from "@/utils/uploadthing";
import { useState, useEffect } from "react";
import ImageModal from "@/component/ImageModal";
import { X } from "lucide-react";


type ImageUploadProps = {
  onChange: (urls: string[]) => void;
  value: string[];
};

const ImageUploadForProduct = ({ onChange, value }: ImageUploadProps): React.JSX.Element => {
  const [imageUrls, setImageUrls] = useState<string[]>(value || []);
 
  // Update local state when value prop changes
  useEffect(() => {
    setImageUrls(value || []);
  }, [value]);

  const handleUploadComplete = (res: { url: string }[]) => {
    const urls = res.map((file) => file.url);
    const newUrls = [...imageUrls, ...urls];
    setImageUrls(newUrls);
    onChange(newUrls); // ეს ატვირთული URL-ები გადავა form-ში
   
  };

  const handleDeleteImage = (indexToDelete: number) => {
    const filteredUrls = imageUrls.filter((_, index) => index !== indexToDelete);
    setImageUrls(filteredUrls);
    onChange(filteredUrls);
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
    <div className=" text-white p-2 rounded">
      <UploadButton
        className="text-white  font-bold py-1 px-3 rounded text-sm"
        endpoint="imageUploader"
        onClientUploadComplete={handleUploadComplete}
      
        content={{
          button: "სურათების ატვირთვა",
          allowedContent: "ყველა ტიპის სურათი (PNG, JPG, GIF, WebP) - შეგიძლიათ რამდენიმე ატვირთოთ",
        }}
        appearance={{
          button: "bg-blue-600 md:w-[50%] w-full text-center hover:bg-blue-700 text-white font-bold py-2 px-4 rounded md:text-[18px] text-[16px]",
          allowedContent: "text-black text-[16px] text-black mt-1",
        }}
      />

      {validImageUrls.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold text-black">ატვირთული სურათები ({validImageUrls.length})</h2>
          <div className="grid md:grid-cols-3 grid-cols-2 gap-3">
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
                    className="absolute cursor-pointer top-2 right-2 bg-black hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
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
    </div>
  );
};

export default ImageUploadForProduct;
