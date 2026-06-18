"use client";

type UploadLoadingIndicatorProps = {
  message?: string;
  className?: string;
  variant?: "inline" | "card";
};

const UploadLoadingIndicator = ({
  message = "სურათები იტვირთება...",
  className = "",
  variant = "inline",
}: UploadLoadingIndicatorProps): React.JSX.Element => {
  if (variant === "card") {
    return (
      <div
        className={`relative rounded border border-dashed border-gray-400 bg-gray-50 h-[320px] flex flex-col items-center justify-center ${className}`}
      >
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full relative mb-3">
          <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-700 animate-pulse">{message}</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-8 h-8 border-4 border-gray-200 rounded-full relative shrink-0">
        <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm font-medium text-black animate-pulse">{message}</p>
    </div>
  );
};

export default UploadLoadingIndicator;
