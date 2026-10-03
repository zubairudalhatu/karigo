/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.karigo.com.ng" }],
        destination: "https://karigo.com.ng/:path*",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
