
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Simple auth function - you can modify this based on your needs
const auth = (req: Request) => {
  // For development, we'll allow uploads without strict auth
  // In production, you should implement proper authentication
  return { id: "dev-user" };
};

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      // For development, we'll skip auth check
      // In production, implement proper authentication here
      const user = auth(req);
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;