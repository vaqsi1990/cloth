
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { ensureDisplayableImageUrl } from "@/lib/ensure-displayable-image-url";

const f = createUploadthing();
const auth = (req: Request) => ({ id: "fakeId" });

async function finalizeUploadedImage(file: {
  name: string
  key: string
  url: string
  ufsUrl: string
}) {
  const fileUrl = file.ufsUrl || file.url
  try {
    const displayUrl = await ensureDisplayableImageUrl(fileUrl, file.name, file.key)
    return { url: displayUrl }
  } catch (error) {
    console.error('Upload image normalization failed:', error)
    throw error
  }
}

export const ourFileRouter = {
  imageUploader: f(
    { image: { maxFileSize: "16MB", maxFileCount: 10 } },
    { awaitServerData: true },
  )
    .middleware(async ({ req }) => {
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const normalized = await finalizeUploadedImage(file)
      return { uploadedBy: metadata.userId, ...normalized };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
