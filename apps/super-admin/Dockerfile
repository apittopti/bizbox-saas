FROM node:20-alpine
WORKDIR /app

# Create package.json
RUN echo '{ \
  "name": "super-admin", \
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

# Install dependencies
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install --verbose

# Create next.config.js
RUN echo 'module.exports = { output: "standalone", reactStrictMode: true }' > next.config.js

# Create app directory
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

# Create super admin page
RUN echo 'export default function Page() { \
  return ( \
    <div style={{ padding: "50px", fontFamily: "Arial", backgroundColor: "#ffebee", minHeight: "100vh" }}> \
      <h1>Super Admin Control</h1> \
      <p>Platform Administration</p> \
      <ul> \
        <li>Infrastructure Management</li> \
        <li>Platform Configuration</li> \
        <li>System Monitoring</li> \
      </ul> \
    </div> \
  ) \
}' > app/page.js

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]