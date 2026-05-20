import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata = {
  title: 'MediChain',
  description: 'Secure. Decentralized. Yours.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <div className="relative min-h-screen">
         {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}