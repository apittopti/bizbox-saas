FROM node:20-alpine
WORKDIR /app

# Create package.json
RUN echo '{ \
  "name": "tenant", \
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

# Create tenant page
RUN echo 'export default function Page() { \
  return ( \
    <div style={{ padding: "50px", fontFamily: "Arial", backgroundColor: "#f3e5f5", minHeight: "100vh" }}> \
      <h1>Business Dashboard</h1> \
      <p>Manage Your Business</p> \
      <ul> \
        <li>Booking Management</li> \
        <li>Staff Scheduling</li> \
        <li>Analytics & Reports</li> \
      </ul> \
    </div> \
  ) \
}' > app/page.js

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]