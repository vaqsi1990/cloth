
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { ensureDisplayableImageUrl } from "@/lib/ensure-displayable-image-url";

const f = createUploadthing();

// Simple auth function - you can modify this based on your needs
const auth = (req: Request) => {
  // For development, we'll allow uploads without strict auth
  // In production, you should implement proper authentication
  return { id: "dev-user" };
};

export const ourFileRouter = {
  imageUploader: f(
    { image: { maxFileSize: "16MB", maxFileCount: 10 } },
    { awaitServerData: true },
  )
    .middleware(async ({ req }) => {
      // For development, we'll skip auth check
      // In production, implement proper authentication here
      const user = auth(req);
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const fileUrl = file.ufsUrl ?? file.url
      const displayUrl = await ensureDisplayableImageUrl(
        fileUrl,
        file.name,
        file.key,
      )

      return { uploadedBy: metadata.userId, url: displayUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
