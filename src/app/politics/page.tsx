import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "საიტის პოლიტიკა - Dressla.ge",
  description: "გაეცანით Dressla.ge-ის კონფიდენციალურობის პოლიტიკას, გამოყენების პირობებს და მომხმარებლის უფლებებს. ჩვენი პასუხისმგებლობა და თქვენი უსაფრთხოება.",
  openGraph: {
    title: "საიტის პოლიტიკა - Dressla.ge",
    description: "გაეცანით Dressla.ge-ის კონფიდენციალურობის პოლიტიკას და გამოყენების პირობებს",
    images: ["/logo-icon.jpg"],
  },
};

const page = () => {
    return (
        <div>
            საიტის პოლიტიკა
        </div>
    )
}

export default page
