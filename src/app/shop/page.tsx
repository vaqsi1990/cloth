import ShopPageClient from '@/component/ShopPageClient'
import React, { Suspense } from 'react'

const page = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-black">იტვირთება...</p>
                </div>
            </div>
        }>
            <ShopPageClient />
        </Suspense>
    )
}

export default page
