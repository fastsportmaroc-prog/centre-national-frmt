import type { NextConfig } from "next";

/**
 * Ne pas dupliquer NEXT_PUBLIC_* dans `env` : Next les fige au build.
 * Si le build tourne sans .env.local, le client garde des valeurs vides
 * alors que le serveur lit .env.local au runtime → bug login local.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
