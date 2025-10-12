import { createRouteHandler } from 'uploadthing/next'
import { ourFileRouter } from './core' // თუ core.ts-ში გაქვს router

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
})