
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { ensureDisplayableImageUrl } from "@/lib/ensure-displayable-image-url";

const f = createUploadthing();
const auth = (req: Request) => ({ id: "fakeId" });

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
