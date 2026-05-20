/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: [
        '@genkit-ai/ai',
        '@genkit-ai/core',
        '@genkit-ai/googleai',
        '@opentelemetry/instrumentation',
        '@opentelemetry/sdk-node',
        'dotprompt',
        'genkit',
        'handlebars',
    ],
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
};

export default nextConfig;
