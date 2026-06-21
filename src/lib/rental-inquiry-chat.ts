import {
  getOrCreateProductChatRoom as createProductChatRoom,
} from '@/lib/chat-product-room'

export async function getOrCreateProductChatRoom(params: {
  productId: number
  buyerId: string
  sellerId: string
  initialMessage: string
}): Promise<number> {
  const { chatRoomId } = await createProductChatRoom({
    buyerId: params.buyerId,
    sellerId: params.sellerId,
    productId: params.productId,
    initialMessage: params.initialMessage,
    addMessageIfExists: true,
  })
  return chatRoomId
}
