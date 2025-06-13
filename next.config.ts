
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // For Backblaze B2 public URLs (e.g., f000.backblazeb2.com, f001.backblazeb2.com, etc.)
        protocol: 'https',
        hostname: '*.backblazeb2.com',
        port: '',
        pathname: '/**',
      },
      { // For Backblaze B2 S3-compatible URLs (e.g., your-bucket-name.s3.us-west-000.backblazeb2.com)
        protocol: 'https',
        hostname: `*.s3.${process.env.BACKBLAZE_B2_S3_REGION || 'us-west-000'}.backblazeb2.com`, // Example, adjust region if needed
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude problematic Node.js modules from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
