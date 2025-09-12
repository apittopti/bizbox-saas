FROM node:20-alpine
WORKDIR /app

# Create package.json
RUN echo '{ \
  "name": "landing", \
  "version": "1.0.0", \
  "scripts": { \
    "dev": "next dev", \
    "build": "next build", \
    "start": "next start" \
  }, \
  "dependencies": { \
    "next": "14.0.0", \
    "react": "18.2.0", \
    "react-dom": "18.2.0" \
  } \
}' > package.json

# Install dependencies with retry logic
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install --verbose

# Create next.config.js
RUN echo 'module.exports = { output: "standalone", reactStrictMode: true }' > next.config.js

# Create app directory and pages
RUN mkdir -p app

# Create layout
RUN echo 'export default function RootLayout({ children }) { \
  return ( \
    <html> \
      <head /> \
      <body>{children}</body> \
    </html> \
  ) \
}' > app/layout.js

# Create main page
RUN echo 'export default function Page() { \
  return ( \
    <div style={{ padding: "50px", fontFamily: "Arial" }}> \
      <h1>BizBox Platform</h1> \
      <p>Multi-Tenant SaaS for UK Service Businesses</p> \
      <ul> \
        <li>Website Builder</li> \
        <li>Smart Booking System</li> \
        <li>Business Management</li> \
      </ul> \
    </div> \
  ) \
}' > app/page.js

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]