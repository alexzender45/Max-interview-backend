# Max-interview-backend

## Project Overview
Max-interview-backend is a backend service designed to support collaborative document editing in real-time. It utilizes WebSocket technology to provide a seamless experience for users working on shared documents.

## Technologies Used
- Node.js
- Express.js
- MongoDB
- Mongoose
- WebSocket
- BullMQ (for job queues)
- Zod (for schema validation)
- Prom-client (for monitoring)

## Installation Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/max-interview-backend.git
   cd max-interview-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory and add the necessary environment variables (e.g., database connection string, JWT secret).

## Running the Application
1. Start the MongoDB service (if not using a cloud database).
2. Run the application:
   ```bash
   npm start
   ```

3. The server will start on `http://localhost:4000`.

## Docker Instructions
1. Use Docker Compose to start the application:
   ```bash
   docker-compose up
   ```

2. Alternatively, build and run the Docker image manually:
   ```bash
   docker build -t max-interview-backend .
   docker run -p 4000:4000 max-interview-backend
   ```

3. The server will be accessible at `http://localhost:4000`.

## API Documentation
- **POST /api/auth/login**: Authenticate a user and return a JWT token.
- **GET /api/documents/:id**: Retrieve a specific document by ID.
- **WebSocket /api/notes**: Establish a WebSocket connection for real-time document collaboration.

## WebSocket Functionality
The application supports real-time collaboration through WebSocket connections. Users can connect to the WebSocket server to receive updates on document changes, presence information, and more.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.
