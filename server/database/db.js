const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
// Get MongoDB URI from environment variables
const URI = process.env.MONGODB_URI; // connection string to MongoDB server

if (!URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

// Global cache to store connection status across hot reloads in development
let cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached; // Assign cached object globally for reuse

const connectToDatabase = async () => {
    if (cached.conn) return cached.conn; // Use existing connection if available

    if (!cached.promise) {
        cached.promise = mongoose.connect(URI, {
            dbName: 'Irrigation',
            bufferCommands: false,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize:3000,
        }).then((mongoose) => mongoose.connection)
          .catch((error) => {
            console.error("Failed to connect to MongoDB:", error);
            throw new Error("Failed to connect to the database");
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

module.exports = connectToDatabase;