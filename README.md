# GrooveNation Backend

The GrooveNation backend is a NodeJS application that serves as the server-side component for the GrooveNation Flutter app. It is built using the Express framework and connects to a MongoDB database for data storage and retrieval. The backend follows a microservices architecture and utilizes Docker for containerization.

## Features

- Provides API endpoints for the GrooveNation app to fetch nearby clubs, events, and ticket information
- Handles user authentication and authorization using JWT
- Implements a social media space for users to share their experiences
- Uses ranking algorithms for social posts to enhance user engagement
- Integrates with AWS S3 for storing and retrieving images and videos
- Utilizes ffmpeg for pre-processing videos before storage
- Generates QR codes for tickets to be scanned
- Supports pagination for efficient data retrieval
- Integrates with MongoDB for data persistence

## Getting Started

To run the backend locally using Docker Compose, follow these steps:

1. Install Docker:
   - Visit the official Docker website: https://www.docker.com
   - Download and install Docker Desktop for your operating system (Windows, macOS, or Linux)
   - Follow the installation instructions provided by Docker

2. Clone the repository:
   ```
   git clone https://github.com/mnm967/groovenation-api-microservices
   ```

3. Navigate to the project directory:
   ```
   cd groovenation-api-microservices
   ```

4. Configure the environment variables:
   - Create a `.env` file in each microservice directory (`users`, `club`, `event`, `social`, `ticket`, `chat`, `admin`).
   - Add the following variables to the `.env` files:
     ```
     PORT=3000
     MONGODB_URI=mongodb://localhost:27017/groovenation
     JWT_SECRET=your-jwt-secret
     AWS_S3_ENDPOINT=your-aws-endpoint
     AWS_ACCESS_KEY_ID=your-aws-access-key
     AWS_SECRET_ACCESS_KEY=your-aws-secret-key
     AWS_S3_BUCKET=your-s3-bucket-name
     SENTRY_DSN=your-sentry-dsn     ```
   - Replace the fields with your actual values.
   - You can use Sentry for tracking bugs, view sentry.io for more details

5. Build and start the containers using Docker Compose:
   ```
   docker-compose up --build
   ```

   This command will build the Docker images for each microservice and start the containers defined in the `docker-compose.yml` file.

6. Access the backend services:
   - The microservices will be accessible at the following URLs:
     - Users: `http://localhost:3000`
     - Club: `http://localhost:3001`
     - Event: `http://localhost:3002`
     - Social: `http://localhost:3003`
     - Ticket: `http://localhost:3004`
     - Chat: `http://localhost:3005`
     - Admin: `http://localhost:3006`
   - The Nginx reverse proxy will be accessible at `http://localhost:8080`

To stop the containers, press `Ctrl+C` in the terminal where Docker Compose is running.

## App Repository

The GrooveNation Flutter app code can be found in the following repository:

https://github.com/mnm967/groovenation_flutter.git

## License

```
Copyright 2023 Mothuso Malunga

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```