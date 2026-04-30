import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile access via common local network / hotspot IPs during dev
  allowedDevOrigins: ['172.20.10.2', '172.20.51.153', '*.local'],

  // Increase body size limit for receipt image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
